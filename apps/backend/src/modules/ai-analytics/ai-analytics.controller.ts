import { Controller, Get, Put, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ModuleAccessGuard } from '@/common/guards/module-access.guard';
import { RequiresModule } from '@/common/decorators/requires-module.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AiAnalyticsService } from './ai-analytics.service';

const READERS  = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER];
const MANAGERS = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN];
const EDITORS  = [UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN];

@ApiTags('ai-analytics')
@ApiBearerAuth('JWT')
@RequiresModule('ai')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
@Controller({ path: 'ai-analytics', version: '1' })
export class AiAnalyticsController {
  constructor(private readonly aiService: AiAnalyticsService) {}

  @Get('students')
  @Roles(...READERS)
  @ApiOperation({ summary: "O'quvchilar risk profili" })
  getStudentProfiles(@CurrentUser() user: JwtPayload) {
    return this.aiService.getStudentRiskProfiles(user);
  }

  @Get('dashboard')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Dashboard summary' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.aiService.getDashboardSummary(user);
  }

  // ── Calibration Panel ──────────────────────────────────────────────────────

  @Get('config')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Rule Engine config (joriy sozlamalar)' })
  getConfig(@CurrentUser() user: JwtPayload) {
    return this.aiService.getRuleEngineConfig(user.schoolId!);
  }

  @Put('config')
  @Roles(...EDITORS)
  @ApiOperation({ summary: 'Rule Engine config yangilash (Guard 1: validation, Guard 2: audit)' })
  async updateConfig(@CurrentUser() user: JwtPayload, @Body() body: any) {
    const result = await this.aiService.updateRuleEngineConfig(
      user.schoolId!,
      body,
      { id: user.sub, name: `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim() || user.email, role: user.role },
    );
    if (result.validationError) {
      throw new BadRequestException(result.validationError);
    }
    return result.config;
  }

  @Post('config/reset')
  @Roles(...EDITORS)
  @ApiOperation({ summary: 'Guard 3: Default sozlamalarga qaytarish' })
  async resetConfig(@CurrentUser() user: JwtPayload) {
    const result = await this.aiService.updateRuleEngineConfig(
      user.schoolId!,
      { __reset: true } as any,
      { id: user.sub, name: `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim() || user.email, role: user.role },
    );
    return result.config;
  }

  @Post('config/preview')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Guard 4: Saqlashdan oldin preview (distribution)' })
  previewConfig(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.aiService.previewConfig(user, body);
  }

  @Get('config/audit')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Guard 2: Config audit log' })
  getAuditLog(@CurrentUser() user: JwtPayload) {
    return this.aiService.getConfigAuditLog(user.schoolId!);
  }
}
