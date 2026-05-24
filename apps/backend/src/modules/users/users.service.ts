import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { parse as csvParse } from 'csv-parse/sync';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { AuthService } from '@/modules/auth/auth.service';
import { UserRole, JwtPayload } from '@eduplatform/types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import {
  assertCanManage,
  assertNotSelf,
  buildVisibleRoleFilter,
} from '@/common/utils/role-hierarchy.util';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  /**
   * ROLE_CREATION_MATRIX — qaysi rol qaysi rollarni yaratishi mumkin.
   * Bu yerda "hierarhiyaga" mos ravishda ruxsatlar berilgan.
   */
  private readonly ROLE_CREATION_MATRIX: Record<UserRole, UserRole[]> = {
    [UserRole.SUPER_ADMIN]: [UserRole.DIRECTOR],
    [UserRole.DIRECTOR]: [
      UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN,
      UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT,
      UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT,
    ],
    [UserRole.VICE_PRINCIPAL]: [
      UserRole.TEACHER, UserRole.CLASS_TEACHER,
      UserRole.ACCOUNTANT, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT,
    ],
    [UserRole.BRANCH_ADMIN]: [
      UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT,
      UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT,
    ],
    // Quyidagilar foydalanuvchi yaratish huquqiga ega emas
    [UserRole.TEACHER]: [],
    [UserRole.CLASS_TEACHER]: [],
    [UserRole.ACCOUNTANT]: [],
    [UserRole.LIBRARIAN]: [],
    [UserRole.STUDENT]: [],
    [UserRole.PARENT]: [],
  };

  /** Branch-scope talab qiluvchi rollar */
  private readonly BRANCH_SCOPED_ROLES = new Set<UserRole>([
    UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER, UserRole.CLASS_TEACHER,
    UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
    UserRole.STUDENT, UserRole.PARENT,
  ]);

  private validateRoleCreation(creatorRole: UserRole, targetRole: UserRole): void {
    const allowed = this.ROLE_CREATION_MATRIX[creatorRole] ?? [];
    if (!allowed.includes(targetRole)) {
      throw new ForbiddenException(
        `Siz "${targetRole}" rolidagi foydalanuvchi yaratish huquqiga ega emassiz`,
      );
    }
  }

  async findAll(
    currentUser: JwtPayload,
    page = 1,
    limit = 20,
    search?: string,
    role?: string,
  ) {
    const skip = (page - 1) * limit;

    // director va vice_principal maktab bo'yicha ko'radi (branchId filter yo'q)
    const isSchoolWide = currentUser.isSuperAdmin
      || currentUser.role === UserRole.DIRECTOR
      || currentUser.role === UserRole.VICE_PRINCIPAL;

    const baseFilter = isSchoolWide
      ? { schoolId: currentUser.schoolId! }
      : buildTenantWhere(currentUser);
    const where: any = { ...baseFilter };

    // Rol-darajasiga ko'ra ko'rinish: actor o'zidan yuqori rolni ko'rmaydi
    const visibleRoleFilter = buildVisibleRoleFilter(currentUser.role as UserRole);
    if (role) {
      // Aniq rol so'ralganda — agar u yashirilgan bo'lsa, bo'sh natija qaytarish
      if (visibleRoleFilter?.notIn?.includes(role as UserRole)) {
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }
      where.role = role;
    } else if (visibleRoleFilter) {
      where.role = visibleRoleFilter;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          ...this.userSelectFields(),
          branch: { select: { id: true, name: true } },
          branchAssignments: {
            where: { isActive: true },
            select: { branch: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, currentUser: JwtPayload) {
    // Defense-in-depth: scope the query by school to prevent ID enumeration
    const user = await this.prisma.user.findFirst({
      where: currentUser.isSuperAdmin
        ? { id }
        : { id, schoolId: currentUser.schoolId! },
      select: { ...this.userSelectFields(), schoolId: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Secondary guard for super_admin viewing cross-school users
    if (!currentUser.isSuperAdmin && user.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Boshqa maktab foydalanuvchisiga kirish taqiqlangan');
    }

    // Rol-darajasi: o'zidan yuqori rolni ko'ra olmaydi (super_admin'ni direktorga ochmaslik)
    const visibleRoleFilter = buildVisibleRoleFilter(currentUser.role as UserRole);
    if (visibleRoleFilter?.notIn?.includes(user.role as UserRole)) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    return user;
  }

  async create(dto: CreateUserDto, currentUser: JwtPayload) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, schoolId: true, role: true, firstName: true, lastName: true },
    });
    if (existing) {
      if (existing.schoolId === currentUser.schoolId) {
        // Frontend bu xatoni "assign-branch dialog" tarzida ko'rsatadi
        throw new ConflictException({
          code: 'USER_EXISTS_IN_SCHOOL',
          message: 'Bu email allaqachon mavjud',
          existingUserId: existing.id,
          existingRole: existing.role,
          existingName: `${existing.firstName} ${existing.lastName}`,
        });
      }
      // Boshqa maktab → bir xil neutral xato
      throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");
    }

    // 1. Role authorization check (matrix-based hierarchy)
    this.validateRoleCreation(currentUser.role as UserRole, dto.role);

    // 2. Non-super-admin can only create users for their school
    const schoolId = currentUser.isSuperAdmin
      ? (dto.schoolId ?? currentUser.schoolId!)
      : currentUser.schoolId!;

    // 3. BranchId validation — ALL users MUST have a branchId
    let branchId = dto.branchId ?? currentUser.branchId ?? null;

    // Director created by super_admin without branchId → auto-assign to main branch
    if (!branchId && dto.role === UserRole.DIRECTOR && schoolId) {
      const mainBranch = await this.prisma.branch.findFirst({
        where: { schoolId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (mainBranch) {
        branchId = mainBranch.id;
      }
    }

    if (!branchId) {
      throw new BadRequestException('Foydalanuvchi uchun branchId majburiy');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BRANCH_ADMIN hard restrictions — defense-in-depth beyond ROLE_CREATION_MATRIX
    // ═══════════════════════════════════════════════════════════════════════════
    if (currentUser.role === UserRole.BRANCH_ADMIN) {
      const forbiddenRoles = new Set<UserRole>([
        UserRole.SUPER_ADMIN,
        UserRole.DIRECTOR,
        UserRole.VICE_PRINCIPAL,
        UserRole.BRANCH_ADMIN,
      ]);

      if (forbiddenRoles.has(dto.role)) {
        throw new ForbiddenException('Filial admin bu rolni yaratishga ruxsatga ega emas');
      }

      if (dto.branchId && dto.branchId !== currentUser.branchId) {
        throw new ForbiddenException("Filial admin boshqa filialga foydalanuvchi qo'sha olmaydi");
      }

      // Force branchId to own branch — ignore any payload override
      branchId = currentUser.branchId!;
    }

    // Legacy branch-scoped guard (covers VP and other branch-scoped creators too)
    if (currentUser.role === UserRole.BRANCH_ADMIN && branchId !== currentUser.branchId) {
      throw new ForbiddenException('Faqat o‘z filialingiz uchun foydalanuvchi yaratish mumkin');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        schoolId,
        branchId,
        passwordHash,
        isFirstLogin: true,
      },
      select: this.userSelectFields(),
    });

    // Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: schoolId ?? undefined,
      action: 'create',
      entity: 'User',
      entityId: user.id,
      newData: { email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    });

    return user;
  }

  async assignBranch(
    id: string,
    dto: { branchId: string; role: UserRole },
    currentUser: JwtPayload,
  ) {
    // 1. Target user mavjud va o'z maktabida
    const targetUser = await this.prisma.user.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        branchAssignments: {
          where: { isActive: true },
          select: { branchId: true },
        },
      },
    });
    if (!targetUser) throw new NotFoundException('Foydalanuvchi topilmadi');

    // 2. Target branch mavjud va o'z maktabida + isActive
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, schoolId: currentUser.schoolId!, isActive: true },
      select: { id: true, name: true },
    });
    if (!branch) throw new NotFoundException('Filial topilmadi');

    // 3. Actor target rolni boshqara olishi shart
    assertCanManage(currentUser, dto.role);

    // 4. Branch admin → faqat o'z filialiga
    if (currentUser.role === UserRole.BRANCH_ADMIN && dto.branchId !== currentUser.branchId) {
      throw new ForbiddenException("Faqat o'z filialingizga biriktirish mumkin");
    }

    // 5. Idempotent upsert
    await this.prisma.userBranchAssignment.upsert({
      where: { userId_branchId: { userId: id, branchId: dto.branchId } },
      update: { role: dto.role, isActive: true },
      create: {
        userId: id,
        branchId: dto.branchId,
        role: dto.role,
        isActive: true,
      },
    });

    // 6. Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'assign_branch',
      entity: 'UserBranchAssignment',
      entityId: id,
      newData: { branchId: dto.branchId, branchName: branch.name, role: dto.role, targetUserEmail: targetUser.email },
    });

    return { message: "Foydalanuvchi filialga biriktirildi" };
  }

  async removeBranchAssignment(
    id: string,
    branchId: string,
    currentUser: JwtPayload,
  ) {
    // 1. Target user mavjud va o'z maktabida
    const targetUser = await this.prisma.user.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      select: { id: true, email: true, branchId: true },
    });
    if (!targetUser) throw new NotFoundException('Foydalanuvchi topilmadi');

    // 2. Asosiy filialni olib tashlab bo'lmasligini tekshirish
    if (targetUser.branchId === branchId) {
      throw new BadRequestException("Asosiy filialni o'zgartirish uchun foydalanuvchini tahrir qiling");
    }

    // 3. Branch admin → faqat o'z filiali
    if (currentUser.role === UserRole.BRANCH_ADMIN && branchId !== currentUser.branchId) {
      throw new ForbiddenException("Faqat o'z filialingizdagi biriktirmani olib tashlashingiz mumkin");
    }

    // 4. Soft delete: isActive=false
    const assignment = await this.prisma.userBranchAssignment.findUnique({
      where: { userId_branchId: { userId: id, branchId } },
    });
    if (!assignment) throw new NotFoundException('Biriktirish topilmadi');

    await this.prisma.userBranchAssignment.update({
      where: { userId_branchId: { userId: id, branchId } },
      data: { isActive: false },
    });

    // 5. Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'unassign_branch',
      entity: 'UserBranchAssignment',
      entityId: id,
      oldData: { branchId, role: assignment.role, targetUserEmail: targetUser.email },
    });

    return { message: "Foydalanuvchi filialdan olib tashlandi" };
  }

  async update(id: string, dto: UpdateUserDto, currentUser: JwtPayload) {
    const before = await this.findOne(id, currentUser);

    // Rol-ierarxiya: faqat o'zidan past yoki o'zini-o'zi (cheklangan field'lar)
    if (id !== currentUser.sub) {
      assertCanManage(currentUser, before.role as UserRole);
    }

    // Prevent mass assignment of sensitive / security-critical fields
    const { role, schoolId, branchId, password, ...safeDto } = dto as any;

    // O'zini-o'zi bloklashni to'sish — login holatini yo'qotmasligi uchun
    if (id === currentUser.sub && safeDto.isActive === false) {
      throw new ForbiddenException("O'zingizni bloklay olmaysiz");
    }

    const updateData: Record<string, any> = {};
    if (safeDto.firstName !== undefined) updateData.firstName = safeDto.firstName;
    if (safeDto.lastName !== undefined) updateData.lastName = safeDto.lastName;
    if (safeDto.email !== undefined) updateData.email = safeDto.email;
    if (safeDto.phone !== undefined) updateData.phone = safeDto.phone;
    if (safeDto.isActive !== undefined) updateData.isActive = safeDto.isActive;
    if (safeDto.avatarUrl !== undefined) updateData.avatarUrl = safeDto.avatarUrl;
    if (safeDto.language !== undefined) updateData.language = safeDto.language;

    // Role changes are NOT allowed via generic update — use a dedicated admin endpoint
    if (role !== undefined) {
      throw new ForbiddenException(
        'Rol o‘zgartirish alohida admin endpoint orqali amalga oshiriladi',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.userSelectFields(),
    });

    // Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'User',
      entityId: id,
      oldData: { firstName: before.firstName, lastName: before.lastName, email: before.email, phone: before.phone },
      newData: updateData,
    });

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const user = await this.findOne(id, currentUser);

    // O'zini-o'zi bloklash taqiqlanadi (login qulflanib qolmasligi uchun)
    assertNotSelf(currentUser.sub, id);

    // Rol-ierarxiya: faqat o'zidan past rolni bloklash mumkin
    assertCanManage(currentUser, user.role as UserRole);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'delete',
      entity: 'User',
      entityId: id,
      oldData: { email: user.email, role: user.role },
    });

    return { message: 'Foydalanuvchi bloklandi' };
  }

  /** Permanent hard-delete — faqat director o'z maktabidagi past rolli foydalanuvchini o'chiradi */
  async hardDelete(id: string, currentUser: JwtPayload) {
    // Faqat director ruxsat berilgan
    if (currentUser.role !== UserRole.DIRECTOR) {
      throw new ForbiddenException('Faqat direktor foydalanuvchini butunlay o‘chira oladi');
    }
    // Foydalanuvchi mavjudligini va bir maktabda ekanligini tekshirish
    const target = await this.prisma.user.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!target) throw new NotFoundException('Foydalanuvchi topilmadi');

    // O'zini-o'zi o'chirishdan himoya
    assertNotSelf(currentUser.sub, target.id);

    // Rol-ierarxiya: super_admin, boshqa direktor, va teng/yuqori rollardan himoya
    assertCanManage(currentUser, target.role as UserRole);

    await this.prisma.user.delete({ where: { id } });

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'hard_delete',
      entity: 'User',
      entityId: id,
      oldData: { email: target.email, role: target.role, firstName: target.firstName, lastName: target.lastName },
    });

    return { message: 'Foydalanuvchi butunlay o‘chirildi' };
  }

  async restore(id: string, currentUser: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Rol-ierarxiya: faqat o'zidan past rolni qayta faollashtirish mumkin
    assertCanManage(currentUser, user.role as UserRole);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
    return { message: 'Foydalanuvchi faollashtirildi' };
  }

  /**
   * Admin tomonidan foydalanuvchi parolini tiklash.
   * Vaqtinchalik parol yaratiladi, isFirstLogin=true qilinadi,
   * barcha mavjud sessiyalar bekor qilinadi.
   */
  async resetPassword(id: string, currentUser: JwtPayload) {
    // 1. Target user ni topish
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, role: true,
        schoolId: true, branchId: true, isActive: true,
      },
    });
    if (!target) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (!target.isActive) throw new BadRequestException('Bloklangan foydalanuvchi parolini tiklab bo‘lmaydi');

    // 2. O'zini-o'zi tiklash taqiqlanadi
    assertNotSelf(currentUser.sub, id);

    // 3. Ruxsatlar matritsasi
    const actorRole = currentUser.role as UserRole;
    const targetRole = target.role as UserRole;

    if (actorRole === UserRole.SUPER_ADMIN) {
      // Super Admin faqat Director parolini tiklay oladi
      if (targetRole !== UserRole.DIRECTOR) {
        throw new ForbiddenException('Super Admin faqat Director parolini tiklay oladi');
      }
    } else if (actorRole === UserRole.DIRECTOR || actorRole === UserRole.VICE_PRINCIPAL) {
      // Director/VP faqat o'z maktabidagi o'zidan past rolni tiklay oladi
      if (target.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Boshqa maktab foydalanuvchisiga ruxsat yo‘q');
      }
      assertCanManage(currentUser, targetRole);
    } else if (actorRole === UserRole.BRANCH_ADMIN) {
      // Branch Admin faqat o'z filialidagi o'zidan past rolni tiklay oladi
      if (target.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Boshqa maktab foydalanuvchisiga ruxsat yo‘q');
      }
      if (target.branchId !== currentUser.branchId) {
        throw new ForbiddenException('Boshqa filial foydalanuvchisiga ruxsat yo‘q');
      }
      assertCanManage(currentUser, targetRole);
    } else {
      throw new ForbiddenException('Sizda parolni tiklash huquqi yo‘q');
    }

    // 4. Vaqtinchalik parol yaratish (12 ta belgi, xavfsiz)
    const tempPassword = randomBytes(9).toString('base64').slice(0, 12).replace(/[^a-zA-Z0-9]/g, '') + randomBytes(2).toString('hex').slice(0, 2);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // 5. Foydalanuvchini yangilash
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, isFirstLogin: true },
    });

    // 6. Barcha sessiyalarni bekor qilish
    await this.authService.logoutAll(id);

    // 7. Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      branchId: currentUser.branchId ?? undefined,
      action: 'password_reset',
      entity: 'User',
      entityId: id,
      newData: { isFirstLogin: true },
    });

    return {
      temporaryPassword: tempPassword,
      message: "Vaqtinchalik parol yaratildi. Foydalanuvchi keyingi kirishda yangi parol o'rnatishi kerak.",
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { ...this.userSelectFields(), schoolId: true, language: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async checkEmail(email: string, currentUser: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { email, schoolId: currentUser.schoolId! },
      include: {
        branch: { select: { id: true, name: true } },
        branchAssignments: {
          where: { isActive: true },
          include: { branch: { select: { id: true, name: true } } },
        },
      },
    });

    // Privacy: faqat o'z maktab — boshqa maktab email'ini ochib bermaslik
    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        primaryBranchId: user.branchId,
        primaryBranchName: user.branch?.name ?? null,
        assignedBranches: user.branchAssignments.map(a => ({
          id: a.branch.id,
          name: a.branch.name,
        })),
      },
    };
  }

  async linkParentStudent(parentId: string, studentId: string, currentUser: JwtPayload) {
    const [parent, student] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: parentId, schoolId: currentUser.schoolId! } }),
      this.prisma.user.findFirst({ where: { id: studentId, schoolId: currentUser.schoolId! } }),
    ]);
    if (!parent) throw new NotFoundException('Ota-ona topilmadi');
    if (!student) throw new NotFoundException('O‘quvchi topilmadi');

    return this.prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: {},
      create: { parentId, studentId },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    // Defense-in-depth: self-service only — verify the user exists and matches
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { passwordHash: true, schoolId: true, isFirstLogin: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Birinchi kirish parolini o'zgartirish faqat /auth/first-login orqali
    if (user.isFirstLogin) {
      throw new ForbiddenException('Birinchi kirishda parolni o‘zgartirish uchun /auth/first-login endpointidan foydalaning');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Joriy parol noto‘g‘ri');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  /**
   * Avatar URL ni yangilash (upload endpointi natijasini saqlash)
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return { message: 'Avatar yangilandi', avatarUrl };
  }

  /**
   * CSV fayldan ommaviy o'quvchi import qilish
   *
   * CSV formatı (header qator majburiy):
   * firstName,lastName,email,password,phone,classId
   */
  async importFromCsv(
    csvBuffer: Buffer,
    currentUser: JwtPayload,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    if (!currentUser.schoolId) {
      throw new ForbiddenException('Maktab ID si topilmadi');
    }

    // CSV import qilingan o'quvchilar uchun branchId
    const importBranchId = currentUser.branchId ?? null;

    let rows: Record<string, string>[];
    try {
      rows = csvParse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (err) {
      throw new BadRequestException(`CSV fayl noto'g'ri format: ${err.message}`);
    }

    if (rows.length === 0) {
      throw new BadRequestException('CSV fayl bo‘sh');
    }

    if (rows.length > 500) {
      throw new BadRequestException('Bir vaqtda 500 tadan ko‘p o‘quvchi yuklab bo‘lmaydi');
    }

    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1 = header, 2 = birinchi data qator

      const firstName = row['firstName']?.trim() || row['Ism']?.trim();
      const lastName = row['lastName']?.trim() || row['Familiya']?.trim();
      const email = row['email']?.trim() || row['Email']?.trim();
      const password = row['password']?.trim() || row['Parol']?.trim() || 'Edu@1234';
      const phone = row['phone']?.trim() || row['Telefon']?.trim();
      const classId = row['classId']?.trim() || row['SinfID']?.trim();
      const rowBranchId = row['branchId']?.trim() || row['FilialID']?.trim();
      const branchId = rowBranchId ?? importBranchId;

      // Majburiy maydonlar tekshirish
      if (!firstName || !lastName || !email) {
        errors.push(`Qator ${rowNum}: firstName, lastName, email majburiy`);
        skipped++;
        continue;
      }

      // Email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Qator ${rowNum}: email format noto'g'ri — ${email}`);
        skipped++;
        continue;
      }

      try {
        // Email takrorlanishini tekshirish
        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists) {
          errors.push(`Qator ${rowNum}: ${email} allaqachon mavjud — o'tkazib yuborildi`);
          skipped++;
          continue;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Classni tekshirish (agar berilgan bo'lsa)
        let validClassId: string | undefined;
        if (classId) {
          const cls = await this.prisma.class.findFirst({
            where: { id: classId, schoolId: currentUser.schoolId! },
          });
          if (!cls) {
            errors.push(`Qator ${rowNum}: Sinf ${classId} topilmadi — o'quvchi qo'shildi, sinfga biriktirilmadi`);
          } else {
            validClassId = classId;
          }
        }

        await this.prisma.user.create({
          data: {
            firstName,
            lastName,
            email,
            passwordHash,
            phone: phone || null,
            role: UserRole.STUDENT,
            schoolId: currentUser.schoolId!,
            branchId,
            isActive: true,
          },
        });

        // Agar sinf berilgan bo'lsa, sinfga biriktirish
        if (validClassId) {
          const createdUser = await this.prisma.user.findUnique({ where: { email } });
          if (createdUser) {
            await this.prisma.classStudent.upsert({
              where: { classId_studentId: { classId: validClassId, studentId: createdUser.id } },
              update: {},
              create: { classId: validClassId, studentId: createdUser.id },
            });
          }
        }

        created++;
      } catch (err) {
        errors.push(`Qator ${rowNum}: ${err.message}`);
        skipped++;
      }
    }

    return { created, skipped, errors };
  }

  private userSelectFields() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      coins: true,
    };
  }
}
