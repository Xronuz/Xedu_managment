import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException, Optional } from '@nestjs/common';
import { IsString, IsOptional, IsEmail, IsBoolean, IsIn, IsUUID, IsDateString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuthService } from '@/modules/auth/auth.service';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { ModuleFlagsService } from '@/common/module-flags/module-flags.service';
import { ModuleName, JwtPayload, UserRole } from '@eduplatform/types';

export class CreateSchoolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug faqat kichik harf, raqam va defis bo‘lishi kerak' })
  @MaxLength(60)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase?.()?.trim())
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  subscriptionTier?: string;

  @IsOptional()
  @IsIn(['CENTRALIZED', 'DECENTRALIZED'])
  financeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  // Birinchi direktor (ixtiyoriy — uchchalasi birga to'ldirilishi kerak)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  directorFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  directorLastName?: string;

  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase?.()?.trim())
  @IsEmail()
  directorEmail?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsIn(['free', 'basic', 'standard', 'premium', 'enterprise'])
  plan?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'trial', 'expired', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: string;

  @IsOptional()
  @IsDateString()
  nextBilling?: string;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;
}

export class ImpersonateDto {
  @IsUUID()
  userId: string;
}

export class BroadcastDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  body: string;

  /** Berilmasa — barcha faol maktablarga */
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsIn(['low', 'normal', 'urgent'])
  priority?: string;
}

export class ToggleModuleDto {
  @IsString()
  moduleName: ModuleName;

  @IsBoolean()
  isEnabled: boolean;

  @IsOptional()
  configJson?: Record<string, any>;
}

// Core modules that are always enabled
const CORE_MODULES: ModuleName[] = [
  ModuleName.AUTH, ModuleName.USERS, ModuleName.CLASSES,
  ModuleName.SCHEDULE, ModuleName.NOTIFICATIONS, ModuleName.MESSAGING, ModuleName.REPORTS,
];

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    @Optional() private readonly eventsGateway: EventsGateway,
    @Optional() private readonly moduleFlags: ModuleFlagsService,
  ) {}

  async getSchools(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [schools, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        include: {
          subscription: true,
          _count: { select: { users: true, classes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.count({ where }),
    ]);
    return { data: schools, meta: { total, page, limit } };
  }

  async getSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: { modules: true, subscription: true },
    });
    if (!school || school.deletedAt) throw new NotFoundException('Maktab topilmadi');
    return school;
  }

  async createSchool(dto: CreateSchoolDto, currentUser?: JwtPayload) {
    const existing = await this.prisma.school.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Bu slug allaqachon band');

    // Direktor maydonlari: yoki uchchalasi to'liq, yoki hech biri
    const directorFields = [dto.directorFirstName, dto.directorLastName, dto.directorEmail];
    const directorProvided = directorFields.some(Boolean);
    if (directorProvided && !directorFields.every(Boolean)) {
      throw new ConflictException('Direktor uchun ism, familiya va email uchchalasi ham kiritilishi kerak');
    }
    // Email login bilan bir xil normalizatsiya qilinadi (lowercase + trim) —
    // aks holda saqlangan email login lookup bilan mos kelmay, direktor
    // hech qachon tizimga kira olmaydi (login.dto email'ni lowercase qiladi).
    const directorEmail = dto.directorEmail?.toLowerCase().trim();
    // Email unikalligi MAKTAB YARATILISHIDAN OLDIN tekshiriladi —
    // aks holda direktorsiz "yetim" maktab yaratilib qolardi
    if (directorProvided) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: directorEmail! },
        select: { id: true },
      });
      if (emailTaken) throw new ConflictException('Bu email allaqachon ro‘yxatdan o‘tgan');
    }

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        subscriptionTier: (dto.subscriptionTier as any) ?? 'basic',
        ...(dto.financeType ? { financeType: dto.financeType as any } : {}),
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        subscription: {
          create: {
            plan: (dto.subscriptionTier as any) ?? 'basic',
            status: 'trial',
          },
        },
      },
    });

    // Sync school profile to SystemConfig so onboarding computed sees them
    const configEntries = [
      { schoolId: school.id, key: 'school_name', value: dto.name },
      ...(dto.address ? [{ schoolId: school.id, key: 'school_address', value: dto.address }] : []),
      ...(dto.phone ? [{ schoolId: school.id, key: 'school_phone', value: dto.phone }] : []),
      { schoolId: school.id, key: 'academic_year', value: '2025-2026' },
    ];
    await this.prisma.systemConfig.createMany({ data: configEntries });

    // Auto-create default "Asosiy filial" branch
    const mainBranch = await this.prisma.branch.create({
      data: {
        schoolId: school.id,
        name: 'Asosiy filial',
        code: 'MAIN',
        isActive: true,
      },
    });

    // Enable all core modules by default
    await this.prisma.schoolModule.createMany({
      data: CORE_MODULES.map((moduleName) => ({
        schoolId: school.id,
        moduleName,
        isEnabled: true,
      })),
    });

    // Birinchi direktorni yaratish (temp parol bir marta javobda qaytadi)
    let director: { id: string; email: string; temporaryPassword: string } | null = null;
    if (directorProvided) {
      const tempPassword =
        randomBytes(9).toString('base64').slice(0, 12).replace(/[^a-zA-Z0-9]/g, '') +
        randomBytes(2).toString('hex').slice(0, 2);
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      const created = await this.prisma.user.create({
        data: {
          schoolId: school.id,
          branchId: mainBranch.id,
          role: 'director' as any,
          email: directorEmail!,
          firstName: dto.directorFirstName!,
          lastName: dto.directorLastName!,
          passwordHash,
          isActive: true,
          isFirstLogin: true,
        },
        select: { id: true, email: true },
      });
      director = { ...created, temporaryPassword: tempPassword };
      await this.auditService.log({
        userId: currentUser?.sub,
        schoolId: school.id,
        action: 'create',
        entity: 'User',
        entityId: created.id,
        newData: { role: 'director', email: created.email, createdVia: 'school_onboarding' },
      });
    }

    return { ...school, mainBranchId: mainBranch.id, director };
  }

  async updateSchool(id: string, dto: Partial<CreateSchoolDto>) {
    await this.getSchool(id);

    // Himoyalangan maydonlar bu endpoint orqali o'zgartirilmaydi:
    // isActive → suspend/reactivate, subscriptionTier → updateSubscription,
    // direktor maydonlari → faqat yaratish oqimida
    const {
      subscriptionTier: _tier,
      directorFirstName: _df,
      directorLastName: _dl,
      directorEmail: _de,
      ...rest
    } = dto as any;
    delete rest.isActive;

    const school = await this.prisma.school.update({ where: { id }, data: rest });

    // Sync updated school profile fields to SystemConfig
    const configUpdates: Record<string, string> = {};
    if (dto.name !== undefined) configUpdates.school_name = dto.name;
    if (dto.phone !== undefined) configUpdates.school_phone = dto.phone;
    if (dto.address !== undefined) configUpdates.school_address = dto.address;

    const ops = Object.entries(configUpdates).map(([key, value]) =>
      this.prisma.systemConfig.upsert({
        where: { schoolId_key: { schoolId: id, key } },
        create: { schoolId: id, key, value },
        update: { value },
      }),
    );
    if (ops.length > 0) {
      await this.prisma.$transaction(ops);
    }

    return school;
  }

  async deleteSchool(id: string, currentUser: JwtPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, deletedAt: true },
    });

    if (!school) throw new NotFoundException('Maktab topilmadi');
    if (school.deletedAt) {
      throw new ConflictException('Maktab allaqachon o‘chirilgan');
    }

    // Soft delete: maktab arxivlanadi va foydalanuvchilar bloklanadi.
    // MUHIM: slug va foydalanuvchi email'lari unikal (global) — o'chirilgan
    // yozuv ularni band qilib turadi. Soft-delete'dan keyin maktab tiklanmaydi
    // (restore yo'q), shu sababli slug + email'larga "__del<ts>" qo'shib bo'shatamiz —
    // aks holda xuddi shu nom/email bilan qayta yaratish "band" xatosini berardi.
    const marker = `__del${Date.now()}`;
    await this.prisma.$transaction([
      this.prisma.school.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: currentUser.sub,
          isActive: false,
          slug: `${school.slug}${marker}`,
        },
      }),
      // Email'larni concat bilan suffikslash (updateMany concat'ni qo'llamaydi)
      this.prisma.$executeRaw`UPDATE "users" SET "email" = "email" || ${marker}, "isActive" = false WHERE "schoolId" = ${id}`,
    ]);

    // Revoke all sessions for school users
    await this.revokeSchoolUserSessions(id);

    // Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      action: 'school_deleted',
      entity: 'School',
      entityId: id,
      newData: { name: school.name, deletedById: currentUser.sub },
    });

    return {
      message: "Maktab arxivlandi. Nom va email'lar bo‘shatildi — qayta yaratish mumkin.",
      schoolId: id,
    };
  }

  /**
   * Maktabni BUTUNLAY o'chirish (hard delete) — barcha bog'liq ma'lumotlar
   * (foydalanuvchilar, filiallar, baholar va h.k.) DB cascade orqali o'chiriladi.
   * Audit loglar saqlanadi (schoolId SetNull). Tiklab bo'lmaydi.
   */
  async hardDeleteSchool(id: string, currentUser: JwtPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!school) throw new NotFoundException('Maktab topilmadi');

    // Sessiyalarni o'chirishdan OLDIN bekor qilamiz (keyin foydalanuvchilar yo'qoladi)
    await this.revokeSchoolUserSessions(id);

    // Cascade delete — barcha bog'liq yozuvlar o'chadi
    await this.prisma.school.delete({ where: { id } });

    // schoolId BERILMAYDI — maktab o'chgani uchun FK null bo'ladi
    await this.auditService.log({
      userId: currentUser.sub,
      action: 'school_deleted',
      entity: 'School',
      entityId: id,
      newData: { name: school.name, hardDelete: true, deletedById: currentUser.sub },
    });
    this.logger.warn(`Maktab BUTUNLAY o'chirildi: ${school.name} (${id})`);

    return {
      message: "Maktab va barcha ma'lumotlari butunlay o‘chirildi.",
      schoolId: id,
    };
  }

  /** Maktabning barcha foydalanuvchi sessiyalarini bekor qiladi (Redis global revoke) */
  private async revokeSchoolUserSessions(schoolId: string): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: { schoolId },
      select: { id: true },
    });
    for (const user of users) {
      await this.authService.logoutAll(user.id, '');
    }
    return users.length;
  }

  /**
   * Maktab faoliyatini to'xtatish (suspend): barcha foydalanuvchilar tizimga
   * kira olmaydi (login + guard darajasida), ochiq sessiyalar bekor qilinadi.
   * deleteSchool'dan farqi: user.isActive'ga TEGILMAYDI — reactivate toza bo'ladi.
   */
  async suspendSchool(id: string, currentUser: JwtPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true, deletedAt: true },
    });
    if (!school || school.deletedAt) throw new NotFoundException('Maktab topilmadi');
    if (!school.isActive) throw new ConflictException('Maktab allaqachon to‘xtatilgan');

    await this.prisma.school.update({ where: { id }, data: { isActive: false } });
    const revokedUsers = await this.revokeSchoolUserSessions(id);

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: id,
      action: 'update',
      entity: 'School',
      entityId: id,
      oldData: { isActive: true },
      newData: { isActive: false, event: 'school_suspended', revokedUsers },
    });
    this.logger.warn(`Maktab to'xtatildi: ${school.name} (${id}), ${revokedUsers} ta sessiya bekor qilindi`);

    return { message: "Maktab faoliyati to‘xtatildi. Barcha sessiyalar bekor qilindi.", schoolId: id };
  }

  /** To'xtatilgan maktabni qayta faollashtirish */
  async reactivateSchool(id: string, currentUser: JwtPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true, deletedAt: true },
    });
    if (!school || school.deletedAt) throw new NotFoundException('Maktab topilmadi');
    if (school.isActive) throw new ConflictException('Maktab allaqachon faol');

    await this.prisma.school.update({ where: { id }, data: { isActive: true } });

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: id,
      action: 'update',
      entity: 'School',
      entityId: id,
      oldData: { isActive: false },
      newData: { isActive: true, event: 'school_reactivated' },
    });
    this.logger.log(`Maktab qayta faollashtirildi: ${school.name} (${id})`);

    return { message: 'Maktab qayta faollashtirildi.', schoolId: id };
  }

  /**
   * Obuna boshqaruvi: Subscription upsert + (plan o'zgarsa) School.subscriptionTier
   * sinxron yangilanadi — ro'yxat/detal badge'lari tier'dan o'qiydi.
   */
  async updateSubscription(schoolId: string, dto: UpdateSubscriptionDto, currentUser: JwtPayload) {
    await this.getSchool(schoolId);

    const upsertData: any = {
      ...(dto.plan ? { plan: dto.plan as any } : {}),
      ...(dto.status ? { status: dto.status as any } : {}),
      ...(dto.billingCycle ? { billingCycle: dto.billingCycle as any } : {}),
      ...(dto.nextBilling !== undefined ? { nextBilling: dto.nextBilling ? new Date(dto.nextBilling) : null } : {}),
      ...(dto.trialEndsAt !== undefined ? { trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null } : {}),
    };

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { schoolId },
        create: {
          schoolId,
          plan: (dto.plan as any) ?? 'basic',
          status: (dto.status as any) ?? 'trial',
          billingCycle: (dto.billingCycle as any) ?? 'monthly',
          nextBilling: dto.nextBilling ? new Date(dto.nextBilling) : undefined,
          trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : undefined,
        },
        update: upsertData,
      }),
      ...(dto.plan
        ? [this.prisma.school.update({ where: { id: schoolId }, data: { subscriptionTier: dto.plan as any } })]
        : []),
    ]);

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId,
      action: 'update',
      entity: 'Subscription',
      entityId: subscription.id,
      newData: dto as any,
    });

    return subscription;
  }

  /**
   * Impersonation: super admin maktab rahbari (director/branch_admin) sifatida
   * 30 daqiqalik sessiya oladi. Har bir kirish audit-log'ga yoziladi.
   */
  async impersonate(schoolId: string, dto: ImpersonateDto, currentUser: JwtPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, isActive: true, deletedAt: true },
    });
    if (!school || school.deletedAt) throw new NotFoundException('Maktab topilmadi');
    if (!school.isActive) {
      throw new ForbiddenException('To‘xtatilgan maktabga impersonation mumkin emas');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: dto.userId, schoolId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, schoolId: true, branchId: true, isActive: true },
    });
    if (!target) throw new NotFoundException('Foydalanuvchi bu maktabda topilmadi');
    if (!target.isActive) throw new ForbiddenException('Foydalanuvchi faol emas');
    if (target.role !== UserRole.DIRECTOR && target.role !== UserRole.BRANCH_ADMIN) {
      throw new ForbiddenException('Faqat direktor yoki filial admin sifatida kirish mumkin');
    }

    const tokens = await this.authService.generateImpersonationTokens(target.id, currentUser);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId,
      action: 'login',
      entity: 'Impersonation',
      entityId: target.id,
      newData: {
        impersonatedBy: currentUser.sub,
        impersonatorEmail: currentUser.email,
        targetEmail: target.email,
        targetRole: target.role,
        ttlSeconds: tokens.expiresIn,
      },
    });

    return {
      user: {
        id: target.id,
        email: target.email,
        firstName: target.firstName,
        lastName: target.lastName,
        role: target.role,
        schoolId: target.schoolId,
        branchId: target.branchId,
        isFirstLogin: false,
      },
      tokens,
      impersonation: { schoolId: school.id, schoolName: school.name, expiresAt },
    };
  }

  /**
   * Platforma e'loni: barcha (yoki bitta) faol maktab direktorlariga
   * in-app bildirishnoma yuboradi.
   */
  async broadcastToDirectors(dto: BroadcastDto, currentUser: JwtPayload) {
    const directors = await this.prisma.user.findMany({
      where: {
        role: 'director' as any,
        isActive: true,
        ...(dto.schoolId ? { schoolId: dto.schoolId } : {}),
        school: { deletedAt: null, isActive: true },
      },
      select: { id: true, schoolId: true, branchId: true },
    });

    // Notification.branchId NOT NULL — branchId'siz direktorlar uchun
    // maktabning eng birinchi filiali fallback sifatida ishlatiladi
    const schoolIdsNeedingBranch = [
      ...new Set(directors.filter((d) => !d.branchId).map((d) => d.schoolId!)),
    ];
    const fallbackBranches = schoolIdsNeedingBranch.length
      ? await this.prisma.branch.findMany({
          where: { schoolId: { in: schoolIdsNeedingBranch }, isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { id: true, schoolId: true },
        })
      : [];
    const firstBranchBySchool = new Map<string, string>();
    for (const b of fallbackBranches) {
      if (!firstBranchBySchool.has(b.schoolId)) firstBranchBySchool.set(b.schoolId, b.id);
    }

    let skipped = 0;
    const rows = directors.flatMap((d) => {
      const branchId = d.branchId ?? firstBranchBySchool.get(d.schoolId!) ?? null;
      if (!branchId) {
        skipped++;
        return [];
      }
      return [{
        schoolId: d.schoolId!,
        branchId,
        recipientId: d.id,
        senderId: currentUser.sub,
        title: dto.title,
        body: dto.body,
        type: 'in_app' as any,
        category: 'announcement' as any,
        priority: dto.priority ?? 'normal',
      }];
    });

    if (rows.length > 0) {
      await this.prisma.notification.createMany({ data: rows });
      // Real-time push (har bir maktabga bittadan)
      const distinctSchools = [...new Set(rows.map((r) => r.schoolId))];
      for (const sId of distinctSchools) {
        this.eventsGateway?.emitToSchool(sId, 'notification:broadcast', { title: dto.title });
      }
    }

    await this.auditService.log({
      userId: currentUser.sub,
      action: 'create',
      entity: 'PlatformBroadcast',
      newData: { title: dto.title, sent: rows.length, skipped, schoolId: dto.schoolId ?? 'all' },
    });
    this.logger.log(`Platforma e'loni yuborildi: "${dto.title}" — ${rows.length} ta direktor (skip: ${skipped})`);

    return { sent: rows.length, skipped, message: `${rows.length} ta direktorga e'lon yuborildi` };
  }

  async toggleModule(schoolId: string, dto: ToggleModuleDto) {
    await this.getSchool(schoolId);
    const result = await this.prisma.schoolModule.upsert({
      where: { schoolId_moduleName: { schoolId, moduleName: dto.moduleName } },
      create: {
        schoolId,
        moduleName: dto.moduleName,
        isEnabled: dto.isEnabled,
        configJson: dto.configJson,
      },
      update: { isEnabled: dto.isEnabled, configJson: dto.configJson },
    });
    // Enforcement keshi darhol yangilansin (guard 60s eski holatni ushlab qolmasin)
    await this.moduleFlags?.invalidate(schoolId);
    return result;
  }

  async getSchoolUsers(schoolId: string, role?: string) {
    await this.getSchool(schoolId);
    const where: any = { schoolId };
    if (role) where.role = role;
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getModules(schoolId: string) {
    return this.prisma.schoolModule.findMany({ where: { schoolId } });
  }

  async getPlatformStats() {
    const [schoolCount, userCount, activeSubscriptions] = await this.prisma.$transaction([
      this.prisma.school.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.subscription.count({ where: { status: 'active' } }),
    ]);
    return { schoolCount, userCount, activeSubscriptions };
  }
}
