import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AuditService } from '@/common/audit/audit.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementStatus, Prisma } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateAnnouncementDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Resolve target audience
    const audience = await this.resolveAudience(schoolId, {
      roles: dto.targetRoles,
      classId: dto.targetClassId,
      branchIds: dto.targetBranchIds,
    });

    const announcement = await this.prisma.announcement.create({
      data: {
        schoolId,
        branchId: dto.targetBranchIds?.length === 1 ? dto.targetBranchIds[0] : null,
        createdById: currentUser.sub,
        title: dto.title,
        body: dto.body,
        priority: dto.priority ?? 'normal',
        status: dto.status ?? 'active',
        targetRoles: dto.targetRoles ?? [],
        targetClassId: dto.targetClassId ?? null,
        targetBranchIds: dto.targetBranchIds ?? [],
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        requireAck: dto.requireAck ?? false,
      },
    });

    // Create receipt records for each audience member
    if (audience.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < audience.length; i += batchSize) {
        const batch = audience.slice(i, i + batchSize);
        await this.prisma.announcementReceipt.createMany({
          data: batch.map(userId => ({
            announcementId: announcement.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId,
      action: 'create',
      entity: 'Announcement',
      entityId: announcement.id,
      newData: {
        title: dto.title,
        priority: dto.priority,
        status: dto.status,
        audienceSize: audience.length,
        targetRoles: dto.targetRoles,
      },
    });

    return { announcement, audienceSize: audience.length };
  }

  async findAll(currentUser: JwtPayload, opts?: { status?: string; page?: number; limit?: number }) {
    const schoolId = currentUser.schoolId!;
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(50, opts?.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.AnnouncementWhereInput = { schoolId };
    if (opts?.status) where.status = opts.status as any;

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          branch: { select: { id: true, name: true } },
          _count: { select: { receipts: true } },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data: data.map(a => ({
        ...a,
        receiptCount: a._count.receipts,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyAnnouncements(currentUser: JwtPayload, opts?: { isRead?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(50, opts?.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.AnnouncementReceiptWhereInput = {
      userId: currentUser.sub,
      announcement: { status: 'active' },
    };
    if (opts?.isRead !== undefined) where.isRead = opts.isRead;

    const [receipts, total] = await Promise.all([
      this.prisma.announcementReceipt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          announcement: {
            include: {
              createdBy: { select: { id: true, firstName: true, lastName: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.announcementReceipt.count({ where }),
    ]);

    return {
      data: receipts.map(r => ({
        receipt: {
          id: r.id,
          isRead: r.isRead,
          readAt: r.readAt,
          acknowledgedAt: r.acknowledgedAt,
        },
        announcement: r.announcement,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { receipts: true } },
      },
    });
    if (!announcement) throw new NotFoundException('E‘lon topilmadi');

    // Get current user's receipt if exists
    const receipt = await this.prisma.announcementReceipt.findUnique({
      where: { announcementId_userId: { announcementId: id, userId: currentUser.sub } },
    });

    return { ...announcement, receipt };
  }

  async markAsRead(id: string, currentUser: JwtPayload) {
    const receipt = await this.prisma.announcementReceipt.updateMany({
      where: { announcementId: id, userId: currentUser.sub, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    if (receipt.count === 0) {
      // Try to create receipt if user is in target audience but no receipt exists
      await this.prisma.announcementReceipt.upsert({
        where: { announcementId_userId: { announcementId: id, userId: currentUser.sub } },
        create: { announcementId: id, userId: currentUser.sub, isRead: true, readAt: new Date() },
        update: { isRead: true, readAt: new Date() },
      });
    }

    return { message: 'O‘qildi deb belgilandi' };
  }

  async acknowledge(id: string, currentUser: JwtPayload) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      select: { requireAck: true },
    });
    if (!announcement) throw new NotFoundException('E‘lon topilmadi');
    if (!announcement.requireAck) {
      throw new BadRequestException('Bu e‘lon tasdiqlashni talab qilmaydi');
    }

    await this.prisma.announcementReceipt.upsert({
      where: { announcementId_userId: { announcementId: id, userId: currentUser.sub } },
      create: { announcementId: id, userId: currentUser.sub, isRead: true, readAt: new Date(), acknowledgedAt: new Date() },
      update: { acknowledgedAt: new Date() },
    });

    return { message: 'Tasdiqlandi' };
  }

  async update(id: string, dto: UpdateAnnouncementDto, currentUser: JwtPayload) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!announcement) throw new NotFoundException('E‘lon topilmadi');
    if (announcement.status === 'active') {
      throw new ForbiddenException('Faol e‘lonni tahrirlash mumkin emas');
    }

    const data: Prisma.AnnouncementUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.targetRoles !== undefined) data.targetRoles = dto.targetRoles;
    if (dto.targetClassId !== undefined) data.targetClassId = dto.targetClassId;
    if (dto.targetBranchIds !== undefined) data.targetBranchIds = dto.targetBranchIds;
    if (dto.scheduledAt !== undefined) data.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.requireAck !== undefined) data.requireAck = dto.requireAck;

    const updated = await this.prisma.announcement.update({
      where: { id },
      data,
    });

    return updated;
  }

  async cancel(id: string, currentUser: JwtPayload) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!announcement) throw new NotFoundException('E‘lon topilmadi');

    await this.prisma.announcement.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return { message: 'E‘lon bekor qilindi' };
  }

  async cleanupExpired() {
    const now = new Date();
    const { count } = await this.prisma.announcement.updateMany({
      where: {
        status: 'active',
        expiresAt: { lt: now },
      },
      data: { status: 'expired' },
    });
    return { expired: count };
  }

  private async resolveAudience(
    schoolId: string,
    filters: { roles?: UserRole[]; classId?: string; branchIds?: string[] },
  ): Promise<string[]> {
    const where: Prisma.UserWhereInput = {
      schoolId,
      isActive: true,
    };

    if (filters.roles && filters.roles.length > 0) {
      where.role = { in: filters.roles as any };
    }

    if (filters.branchIds && filters.branchIds.length > 0) {
      where.OR = [
        { branchId: { in: filters.branchIds } },
        { branchAssignments: { some: { branchId: { in: filters.branchIds }, isActive: true } } },
      ];
    }

    if (filters.classId) {
      // Target students and parents of a specific class
      const classStudents = await this.prisma.classStudent.findMany({
        where: { classId: filters.classId },
        select: { studentId: true },
      });
      const studentIds = classStudents.map(cs => cs.studentId);

      const parentLinks = await this.prisma.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { parentId: true },
      });
      const parentIds = parentLinks.map(pl => pl.parentId);

      const classUserIds = [...new Set([...studentIds, ...parentIds])];
      where.id = { in: classUserIds };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    return users.map(u => u.id);
  }
}
