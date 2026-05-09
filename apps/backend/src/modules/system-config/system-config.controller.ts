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
}
