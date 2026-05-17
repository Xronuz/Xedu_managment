import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { IsOptional, IsNumber, IsString, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SystemConfigService, SystemConfigMap } from './system-config.service';

class UpdateConfigDto implements Partial<SystemConfigMap> {
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  bhm?: number;

  @IsOptional() @IsString()
  academic_year?: string;

  @IsOptional() @IsString()
  school_name?: string;

  @IsOptional() @IsString()
  school_phone?: string;

  @IsOptional() @IsString()
  school_address?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  pass_threshold?: number;

  @IsOptional() @IsNumber() @Min(1) @Max(31) @Type(() => Number)
  work_days?: number;
}

class UpdateOnboardingDto {
  @IsOptional() @IsNumber() @Min(0) @Max(6) @Type(() => Number)
  onboardingStep?: number;

  @IsOptional() @IsBoolean()
  onboardingCompleted?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'system-config', version: '1' })
export class SystemConfigController {
  constructor(
    private readonly service: SystemConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** GET /system-config — barcha konfiguratsiyalarni olish */
  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT)
  getAll(@CurrentUser() user: JwtPayload) {
    return this.service.getAll(user.schoolId!);
  }

  /** PATCH /system-config — qiymatlarni yangilash (faqat director) */
  @Patch()
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateConfigDto,
  ) {
    await this.service.setBulk(user.schoolId!, dto as any);

    // Sync school profile fields to School model so onboarding computed sees them
    const schoolData: Record<string, string> = {};
    if (dto.school_name !== undefined) schoolData.name = dto.school_name;
    if (dto.school_phone !== undefined) schoolData.phone = dto.school_phone;
    if (dto.school_address !== undefined) schoolData.address = dto.school_address;

    if (Object.keys(schoolData).length > 0) {
      await this.prisma.school.update({
        where: { id: user.schoolId! },
        data: schoolData,
      });
    }

    return this.service.getAll(user.schoolId!);
  }

  /** GET /system-config/onboarding — onboarding holati */
  @Get('onboarding')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT)
  async getOnboardingStatus(@CurrentUser() user: JwtPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId! },
      select: { onboardingStep: true, onboardingCompleted: true },
    });
    return school ?? { onboardingStep: 0, onboardingCompleted: false };
  }

  /** PATCH /system-config/onboarding — onboarding holatini yangilash */
  @Patch('onboarding')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async updateOnboardingStatus(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateOnboardingDto,
  ) {
    await this.prisma.school.update({
      where: { id: user.schoolId! },
      data: {
        ...(dto.onboardingStep !== undefined && { onboardingStep: dto.onboardingStep }),
        ...(dto.onboardingCompleted !== undefined && { onboardingCompleted: dto.onboardingCompleted }),
      },
    });
    return { success: true };
  }

  /** GET /system-config/onboarding-computed — real DB data asosida onboarding holati */
  @Get('onboarding-computed')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PARENT)
  async getOnboardingComputed(@CurrentUser() user: JwtPayload) {
    const schoolId = user.schoolId!;

    // 1. School profile
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, phone: true, address: true },
    });
    const schoolProfileMissing: string[] = [];
    if (!school?.name) schoolProfileMissing.push('name');
    if (!school?.phone) schoolProfileMissing.push('phone');
    if (!school?.address) schoolProfileMissing.push('address');

    // Academic year from system config (key-value store)
    const sysConfig = await this.prisma.systemConfig.findUnique({
      where: { schoolId_key: { schoolId, key: 'academic_year' } },
      select: { value: true },
    });
    if (!sysConfig?.value) schoolProfileMissing.push('academic_year');

    // 2. Branches
    const branches = await this.prisma.branch.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    });
    const branchesMissing: string[] = [];
    if (branches.length === 0) branchesMissing.push('branches');

    // 3. Staff (at least Director)
    const staffCount = await this.prisma.user.count({
      where: { schoolId, isActive: true },
    });
    const staffMissing: string[] = [];
    if (staffCount === 0) staffMissing.push('staff');

    // 4. Education (classes, subjects, teachers)
    const classCount = await this.prisma.class.count({ where: { schoolId } });
    const subjectCount = await this.prisma.subject.count({ where: { schoolId } });
    const teacherCount = await this.prisma.user.count({
      where: { schoolId, role: { in: ['teacher', 'class_teacher'] } },
    });
    const educationMissing: string[] = [];
    if (classCount === 0) educationMissing.push('classes');
    if (subjectCount === 0) educationMissing.push('subjects');
    if (teacherCount === 0) educationMissing.push('teachers');

    const schoolProfileCompleted = schoolProfileMissing.length === 0;
    const branchesCompleted = branchesMissing.length === 0;
    const staffCompleted = staffMissing.length === 0;
    const educationCompleted = educationMissing.length === 0;

    return {
      schoolProfile: { completed: schoolProfileCompleted, missing: schoolProfileMissing },
      branches: { completed: branchesCompleted, missing: branchesMissing },
      staff: { completed: staffCompleted, missing: staffMissing },
      education: { completed: educationCompleted, missing: educationMissing },
      overallCompleted: schoolProfileCompleted && branchesCompleted && staffCompleted && educationCompleted,
    };
  }
}
