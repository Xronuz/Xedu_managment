import { Controller, Get, Post, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OpsCommandCenterService } from './ops-command-center.service';
import {
  TodaySummaryResponseDto,
  OpsAlertDto,
  ReadinessScoreResponseDto,
} from './dto/ops-response.dto';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { RedisService } from '@/common/redis/redis.service';

@ApiTags('ops-command-center')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ version: '1' })
export class OpsCommandCenterController {
  constructor(
    private readonly opsService: OpsCommandCenterService,
    private readonly redis: RedisService,
  ) {}

  // ─── Today Summary ─────────────────────────────────────────────────────────

  @Get('ops/today-summary')
  @ApiOperation({ summary: 'Bugunlik operatsion umumiy ko\'rinish' })
  @ApiQuery({ name: 'branchId', required: false })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  async getTodaySummary(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
  ): Promise<TodaySummaryResponseDto> {
    return this.opsService.getTodaySummary(user, branchId) as Promise<TodaySummaryResponseDto>;
  }

  // ─── Alerts ────────────────────────────────────────────────────────────────

  @Get('ops/alerts')
  @ApiOperation({ summary: 'Operatsion ogohlantirishlar' })
  @ApiQuery({ name: 'branchId', required: false })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
    UserRole.ACCOUNTANT,
  )
  async getAlerts(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
  ): Promise<OpsAlertDto[]> {
    const alerts = await this.opsService.getAlerts(user, branchId);

    // Filter out acknowledged alerts
    const ackKey = `ops:alerts:ack:${user.schoolId}:${branchId ?? 'all'}`;
    const acknowledged = await this.redis.smembers(ackKey);
    const ackSet = new Set(acknowledged);

    return alerts.filter(a => !ackSet.has(a.id)) as OpsAlertDto[];
  }

  @Post('ops/alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Ogohlantirishni o\'qib chiqilgan deb belgilash' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
    UserRole.ACCOUNTANT,
  )
  async acknowledgeAlert(
    @CurrentUser() user: JwtPayload,
    @Param('id') alertId: string,
    @Query('branchId') branchId?: string,
  ): Promise<{ success: boolean }> {
    const ackKey = `ops:alerts:ack:${user.schoolId}:${branchId ?? 'all'}`;
    await this.redis.sadd(ackKey, alertId);
    // Expire the acknowledged set after 7 days so alerts can reappear if condition persists
    await this.redis.expire(ackKey, 7 * 24 * 60 * 60);
    return { success: true };
  }

  // ─── Readiness Score ───────────────────────────────────────────────────────

  @Get('schools/:id/readiness')
  @ApiOperation({ summary: 'Maktab tayyorlik balli' })
  @ApiParam({ name: 'id', description: 'School ID' })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
  )
  async getReadiness(
    @CurrentUser() user: JwtPayload,
    @Param('id') schoolId: string,
  ): Promise<ReadinessScoreResponseDto> {
    if (user.schoolId !== schoolId) {
      throw new ForbiddenException('Faqat o\'z maktabingiz uchun ko\'rishingiz mumkin');
    }
    return this.opsService.getReadinessScore(user, schoolId) as Promise<ReadinessScoreResponseDto>;
  }

  @Post('schools/:id/readiness/recalculate')
  @ApiOperation({ summary: 'Tayyorlik ballini qayta hisoblash' })
  @ApiParam({ name: 'id', description: 'School ID' })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
  )
  async recalculateReadiness(
    @CurrentUser() user: JwtPayload,
    @Param('id') schoolId: string,
  ): Promise<ReadinessScoreResponseDto> {
    if (user.schoolId !== schoolId) {
      throw new ForbiddenException('Faqat o\'z maktabingiz uchun ko\'rishingiz mumkin');
    }
    return this.opsService.recalculateReadiness(user, schoolId) as Promise<ReadinessScoreResponseDto>;
  }
}
