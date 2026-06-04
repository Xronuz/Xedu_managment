import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AiAnalyticsService } from './ai-analytics.service';

const ANALYTICS_READERS = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN,
  UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER,
];
const ANALYTICS_MANAGERS = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN,
];

@ApiTags('ai-analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'ai-analytics', version: '1' })
export class AiAnalyticsController {
  constructor(private readonly aiService: AiAnalyticsService) {}

  @Get('students')
  @Roles(...ANALYTICS_READERS)
  @ApiOperation({ summary: "O'quvchilar risk profili" })
  getStudentProfiles(@CurrentUser() user: JwtPayload) {
    return this.aiService.getStudentRiskProfiles(user);
  }

  @Get('dashboard')
  @Roles(...ANALYTICS_MANAGERS)
  @ApiOperation({ summary: 'Dashboard summary' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.aiService.getDashboardSummary(user);
  }

  // ── Calibration Panel ──────────────────────────────────────────────────────
  @Get('config')
  @Roles(...ANALYTICS_MANAGERS)
  @ApiOperation({ summary: "Rule Engine konfiguratsiyasi (maktab siyosatiga mos)" })
  getConfig(@CurrentUser() user: JwtPayload) {
    return this.aiService.getRuleEngineConfig(user.schoolId!);
  }

  @Put('config')
  @Roles(UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Rule Engine konfiguratsiyasini yangilash" })
  updateConfig(
    @CurrentUser() user: JwtPayload,
    @Body() body: any,
  ) {
    return this.aiService.updateRuleEngineConfig(user.schoolId!, body);
  }
}
