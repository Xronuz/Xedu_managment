import { Injectable, ForbiddenException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationQueueService } from '@/modules/notifications/notification-queue.service';
import { AuditService } from '@/common/audit/audit.service';
import { UserRole, type JwtPayload } from '@eduplatform/types';
import { Invitation, InvitationStatus, Prisma } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
import * as bcrypt from 'bcrypt';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { canManageUser, assertCanManage } from '@/common/utils/role-hierarchy.util';

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  private readonly ROLE_CREATION_MATRIX: Record<UserRole, UserRole[]> = {
    [UserRole.SUPER_ADMIN]: Object.values(UserRole),
    [UserRole.DIRECTOR]: [UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT],
    [UserRole.VICE_PRINCIPAL]: [UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT],
    [UserRole.BRANCH_ADMIN]: [UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT],
    [UserRole.TEACHER]: [],
    [UserRole.CLASS_TEACHER]: [],
    [UserRole.ACCOUNTANT]: [],
    [UserRole.LIBRARIAN]: [],
    [UserRole.STUDENT]: [],
    [UserRole.PARENT]: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly auditService: AuditService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getFrontendUrl(): string {
    const origins = this.config.get('ALLOWED_ORIGINS', 'http://localhost:3000');
    return origins.split(',')[0].trim();
  }

  private validateRoleCreation(creatorRole: UserRole, targetRole: UserRole): void {
    const allowed = this.ROLE_CREATION_MATRIX[creatorRole] ?? [];
    if (!allowed.includes(targetRole)) {
      throw new ForbiddenException(`Siz ${targetRole} rolini taklif qilish huquqiga ega emassiz`);
    }
  }

  private async assertCanInviteToBranch(currentUser: JwtPayload, branchId?: string): Promise<void> {
    if (currentUser.isSuperAdmin) return;
    if (!branchId) return;
    // Director/vice_principal can invite to any branch in their school
    if (currentUser.role === UserRole.DIRECTOR || currentUser.role === UserRole.VICE_PRINCIPAL) return;
    // Branch admin can only invite to their own branch
    if (currentUser.role === UserRole.BRANCH_ADMIN) {
      const allowed = [currentUser.branchId, ...(currentUser.assignedBranchIds ?? [])];
      if (!allowed.includes(branchId)) {
        throw new ForbiddenException('Siz faqat o\'z filialingizga taklif yuborishingiz mumkin');
      }
    }
  }

  private async cleanupExpiredInvitations(schoolId: string): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { schoolId, status: InvitationStatus.PENDING, expiresAt: { lt: new Date() } },
      data: { status: InvitationStatus.EXPIRED },
    });
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  async create(dto: { email: string; firstName?: string; lastName?: string; role: UserRole; branchId?: string }, currentUser: JwtPayload): Promise<{ invitation: Invitation; rawToken: string }> {
    this.validateRoleCreation(currentUser.role as UserRole, dto.role);
    await this.assertCanInviteToBranch(currentUser, dto.branchId);

    const schoolId = currentUser.schoolId!;

    // Check for existing active user with same email in same school
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, schoolId, isActive: true },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException({ code: 'USER_EXISTS_IN_SCHOOL', message: 'Bu email allaqachon maktabda mavjud' });
    }

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: { email: dto.email, schoolId, status: InvitationStatus.PENDING },
    });
    if (existingInvitation) {
      throw new ConflictException({ code: 'PENDING_INVITATION_EXISTS', message: 'Bu emailga kutilayotgan taklif allaqachon mavjud' });
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        role: dto.role,
        schoolId,
        branchId: dto.branchId ?? null,
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt: addDays(new Date(), INVITATION_EXPIRY_DAYS),
        createdById: currentUser.sub,
      },
    });

    // Send email asynchronously
    await this.sendInvitationEmail(invitation, rawToken);

    // Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId,
      action: 'create',
      entity: 'Invitation',
      entityId: invitation.id,
      newData: { email: invitation.email, role: invitation.role, branchId: invitation.branchId },
    });

    return { invitation, rawToken };
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  async findAll(currentUser: JwtPayload, page = 1, limit = 20, status?: InvitationStatus): Promise<{ data: Invitation[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    await this.cleanupExpiredInvitations(currentUser.schoolId!);

    const where: Prisma.InvitationWhereInput = {
      ...buildTenantWhere(currentUser),
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.invitation.count({ where }),
    ]);

    return {
      data: data as any,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Get one ──────────────────────────────────────────────────────────────────

  async findOne(id: string, currentUser: JwtPayload): Promise<Invitation> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!invitation) throw new NotFoundException('Taklif topilmadi');
    return invitation as any;
  }

  // ── Resend ───────────────────────────────────────────────────────────────────

  async resend(id: string, currentUser: JwtPayload): Promise<{ invitation: Invitation; rawToken: string }> {
    const invitation = await this.findOne(id, currentUser);

    if (invitation.status !== InvitationStatus.PENDING && invitation.status !== InvitationStatus.EXPIRED) {
      throw new BadRequestException('Faqat kutilayotgan yoki muddati o\'tgan taklifni qayta yuborish mumkin');
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: {
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt: addDays(new Date(), INVITATION_EXPIRY_DAYS),
        revokedAt: null,
      },
    });

    await this.sendInvitationEmail(updated, rawToken);

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId!,
      action: 'update',
      entity: 'Invitation',
      entityId: id,
      oldData: { status: invitation.status },
      newData: { status: InvitationStatus.PENDING },
    });

    return { invitation: updated, rawToken };
  }

  // ── Revoke ───────────────────────────────────────────────────────────────────

  async revoke(id: string, currentUser: JwtPayload): Promise<void> {
    const invitation = await this.findOne(id, currentUser);
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan taklifni bekor qilish mumkin');
    }

    await this.prisma.invitation.update({
      where: { id },
      data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    });

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId!,
      action: 'delete',
      entity: 'Invitation',
      entityId: id,
      oldData: { status: InvitationStatus.PENDING },
      newData: { status: InvitationStatus.REVOKED },
    });
  }

  // ── Validate token (public) ──────────────────────────────────────────────────

  async validateToken(token: string): Promise<{ valid: boolean; invitation?: any; reason?: 'invalid' | 'expired' | 'accepted' | 'revoked' }> {
    const tokenHash = this.hashToken(token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { school: { select: { name: true } }, branch: { select: { name: true } }, createdBy: { select: { firstName: true, lastName: true } } },
    });

    if (!invitation) {
      return { valid: false, reason: 'invalid' };
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      return { valid: false, reason: 'accepted' };
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      return { valid: false, reason: 'revoked' };
    }

    if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt < new Date()) {
      return { valid: false, reason: 'expired' };
    }

    return {
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        schoolName: invitation.school.name,
        branchName: invitation.branch?.name,
        invitedByName: invitation.createdBy ? `${invitation.createdBy.firstName} ${invitation.createdBy.lastName}` : undefined,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  }

  // ── Accept (public) ──────────────────────────────────────────────────────────

  async accept(token: string, password: string): Promise<{ userId: string }> {
    const tokenHash = this.hashToken(token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new BadRequestException('Taklif havolasi noto\'g\'ri yoki muddati o\'tgan');
    }

    if (invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Taklif havolasi noto\'g\'ri yoki muddati o\'tgan');
    }

    // Check if user already exists
    const existing = await this.prisma.user.findFirst({
      where: { email: invitation.email, schoolId: invitation.schoolId },
    });

    if (existing) {
      throw new ConflictException('Bu email bilan foydalanuvchi allaqachon mavjud');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: invitation.email,
        firstName: invitation.firstName ?? '',
        lastName: invitation.lastName ?? '',
        role: invitation.role,
        schoolId: invitation.schoolId,
        branchId: invitation.branchId,
        passwordHash,
        isActive: true,
        isFirstLogin: true,
        language: 'uz',
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
    });

    // Audit log (no userId since this is a public endpoint)
    await this.auditService.log({
      schoolId: invitation.schoolId,
      action: 'create',
      entity: 'User',
      entityId: user.id,
      newData: { email: user.email, role: user.role, source: 'invitation_acceptance' },
    });

    return { userId: user.id };
  }

  // ── Email ────────────────────────────────────────────────────────────────────

  private async sendInvitationEmail(invitation: Invitation, rawToken: string): Promise<void> {
    const acceptUrl = `${this.getFrontendUrl()}/accept-invite?token=${rawToken}`;
    const subject = 'Xedu platformasiga taklif';
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">Xedu — Ta'lim boshqaruv tizimi</h2>
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          Siz Xedu platformasiga taklif qilindingiz. Hisobingizni faollashtirish uchun quyidagi tugmani bosing.
        </p>
        <a href="${acceptUrl}" style="display: inline-block; padding: 12px 24px; background: #0F7B53; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Hisobni faollashtirish
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
          Havola ${INVITATION_EXPIRY_DAYS} kun davomida amal qiladi. Agar siz bu taklifni kutmasangiz, ushbu xatni e'tiborsiz qoldiring.
        </p>
      </div>
    `;

    await this.notificationQueue.queueEmail({
      to: invitation.email,
      subject,
      html,
      text: `Siz Xedu platformasiga taklif qilindingiz. Havola: ${acceptUrl}`,
    });
  }
}
