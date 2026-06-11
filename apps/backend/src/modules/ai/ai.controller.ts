import {
  Controller, Get, Post, Body, Query, Param,
  ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ModuleAccessGuard } from '@/common/guards/module-access.guard';
import { RequiresModule } from '@/common/decorators/requires-module.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AiProviderService } from './ai-provider.service';
import { AiUsageService } from './ai-usage.service';
import { AiQuotaService } from './ai-quota.service';
import { AiEntitlementService } from './ai-entitlement.service';

const ADMIN_ROLES = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN,
];

@ApiTags('ai')
@ApiBearerAuth('JWT')
@RequiresModule('ai')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(
    private readonly providerService: AiProviderService,
    private readonly usageService: AiUsageService,
    private readonly quotaService: AiQuotaService,
    private readonly entitlementService: AiEntitlementService,
  ) {}

  // ─── Health / Status ──────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'AI tizimi holati' })
  async getStatus(@CurrentUser() user: JwtPayload) {
    const provider = await this.providerService.getProvider(user.schoolId!);
    return {
      provider: provider.name,
      model: provider.getModelInfo(),
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Usage Analytics ──────────────────────────────────────────────────────

  @Get('usage/summary')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'AI foydalanish umumiy statistikasi' })
  async getUsageSummary(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageService.getUsageSummary(user.schoolId!, days);
  }

  @Get('usage/me')
  @ApiOperation({ summary: 'O‘z AI foydalanish tarixi' })
  async getMyUsage(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageService.getUserUsage(user.sub, days);
  }

  // ─── Quota Management ─────────────────────────────────────────────────────

  @Get('quota/:feature')
  @ApiOperation({ summary: 'Xususiyat kvotasini tekshirish' })
  async checkQuota(
    @CurrentUser() user: JwtPayload,
    @Query('feature') feature: string,
  ) {
    return this.quotaService.checkQuota(user.schoolId!, feature);
  }

  @Post('quota/:feature')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Xususiyat kvota limitini o‘rnatish' })
  async setQuota(
    @CurrentUser() user: JwtPayload,
    @Query('feature') feature: string,
    @Body() body: { limit: number },
  ) {
    await this.quotaService.setQuotaLimit(user.schoolId!, feature, body.limit);
    return { message: 'Kvota sozlandi', feature, limit: body.limit };
  }

  // ─── Entitlement ──────────────────────────────────────────────────────────

  @Get('entitlement')
  @ApiOperation({ summary: 'O‘z entitlement ma‘lumotlari' })
  async getMyEntitlement(@CurrentUser() user: JwtPayload) {
    const entitlement = await this.entitlementService.getUserEntitlement(user.sub);
    return {
      userId: user.sub,
      tier: entitlement?.tier ?? 'free',
      features: entitlement?.features ?? {},
      expiresAt: entitlement?.expiresAt ?? null,
    };
  }

  @Post('entitlement/:userId')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Foydalanuvchi entitlement‘ini sozlash' })
  async setUserEntitlement(
    @Param('userId') userId: string,
    @Body() body: { tier: string; features: Record<string, boolean>; expiresAt?: string },
  ) {
    await this.entitlementService.setUserEntitlement(
      userId,
      body.tier,
      body.features,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
    return { message: 'Entitlement yangilandi', userId, tier: body.tier };
  }

  // ─── Demo / Stub ──────────────────────────────────────────────────────────

  @Post('demo/generate')
  @ApiOperation({ summary: 'AI matn generatsiyasi (demo)' })
  async demoGenerate(
    @CurrentUser() user: JwtPayload,
    @Body() body: { prompt: string; feature?: string },
  ) {
    const result = await this.providerService.generateText(
      user.schoolId!,
      user.sub,
      body.feature ?? 'demo',
      body.prompt,
    );
    return result;
  }
}
