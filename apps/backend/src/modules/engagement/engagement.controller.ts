import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { EngagementConfigService, EngagementConfig } from './engagement-config.service';
import { AchievementService } from './achievement.service';
import { AccountabilityService } from './accountability.service';
import { RecoveryService } from './recovery.service';
import { EngagementAnalyticsService } from './engagement-analytics.service';
import { RequireEngagement } from './require-engagement.decorator';
import { RequireEngagementGuard } from './require-engagement.guard';

const ADMIN_ROLES = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN];
const TEACHER_ROLES = [UserRole.TEACHER, UserRole.CLASS_TEACHER, ...ADMIN_ROLES];

@ApiTags('engagement')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'engagement', version: '1' })
export class EngagementController {
  constructor(
    private readonly configService: EngagementConfigService,
    private readonly achievementService: AchievementService,
    private readonly accountabilityService: AccountabilityService,
    private readonly recoveryService: RecoveryService,
    private readonly analyticsService: EngagementAnalyticsService,
  ) {}

  // ─── Settings (Director only) ─────────────────────────────────────────────

  @Get('config')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Engagement konfiguratsiyasini olish' })
  async getConfig(@CurrentUser() user: JwtPayload) {
    return this.configService.getAll(user.schoolId!);
  }

  @Patch('config')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Engagement konfiguratsiyasini yangilash' })
  async updateConfig(
    @CurrentUser() user: JwtPayload,
    @Body() payload: Partial<EngagementConfig>,
  ) {
    await this.configService.setBulk(user.schoolId!, payload);
    return this.configService.getAll(user.schoolId!);
  }

  // ─── Achievements ─────────────────────────────────────────────────────────

  @Get('achievements')
  @Roles(UserRole.STUDENT, UserRole.PARENT, ...TEACHER_ROLES)
  @RequireEngagement('engagement_achievements')
  @UseGuards(RequireEngagementGuard)
  @ApiOperation({ summary: "Mukofotlar ro'yxati (progress bilan)" })
  async listAchievements(
    @CurrentUser() user: JwtPayload,
    @Query('studentId') studentId?: string,
  ) {
    const targetId = user.role === UserRole.STUDENT ? user.sub : (studentId ?? user.sub);
    return this.achievementService.listWithProgress(targetId, user.schoolId!);
  }

  @Post('achievements/seed')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Standart mukofotlarni yaratish' })
  async seedAchievements(@CurrentUser() user: JwtPayload) {
    await this.achievementService.seedDefaultAchievements(user.schoolId!);
    return { message: 'Mukofotlar yaratildi' };
  }

  // ─── Recovery ─────────────────────────────────────────────────────────────

  @Get('recovery')
  @Roles(UserRole.STUDENT, ...TEACHER_ROLES)
  @RequireEngagement('engagement_recovery_enabled')
  @UseGuards(RequireEngagementGuard)
  @ApiOperation({ summary: 'Tiklanish yo‘li' })
  async getRecoveryPath(
    @CurrentUser() user: JwtPayload,
    @Query('studentId') studentId?: string,
  ) {
    const targetId = user.role === UserRole.STUDENT ? user.sub : (studentId ?? user.sub);
    return this.accountabilityService.getRecoveryPath(targetId, user.schoolId!);
  }

  @Post('recovery/:studentId')
  @Roles(...TEACHER_ROLES)
  @RequireEngagement('engagement_recovery_enabled')
  @UseGuards(RequireEngagementGuard)
  @ApiOperation({ summary: 'Tiklanish mukofotini qo‘llash' })
  async applyRecovery(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Body() body: { reason: string },
  ) {
    return this.recoveryService.applyRecovery(studentId, user.schoolId!, body.reason, user.sub);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get('analytics/class-participation')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Sinf ishtiroki metrikalari' })
  async getClassParticipation(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
  ) {
    return this.analyticsService.getClassParticipation(user.schoolId!, classId);
  }

  @Get('analytics/reward-distribution')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Mukofot taqsimoti adolati' })
  async getRewardDistribution(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getRewardDistribution(user.schoolId!, days);
  }

  @Get('analytics/accountability-distribution')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Hisobdorlik taqsimoti' })
  async getAccountabilityDistribution(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getAccountabilityDistribution(user.schoolId!, days);
  }

  @Get('analytics/trend')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Engagement dinamikasi' })
  async getEngagementTrend(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getEngagementTrend(user.schoolId!, days);
  }

  @Get('analytics/exam-correlation')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Imtihon va engagement o‘rtasidagi bog‘liqlik' })
  async getExamCorrelation(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(90), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getExamEngagementCorrelation(user.schoolId!, days);
  }
}
