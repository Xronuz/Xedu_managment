import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EngagementConfigService } from '@/modules/engagement/engagement-config.service';
import { AiQuotaService } from './ai-quota.service';
import { JwtPayload } from '@eduplatform/types';

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  quotaRemaining?: number;
  tier?: string;
}

@Injectable()
export class AiEntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementConfig: EngagementConfigService,
    private readonly quotaService: AiQuotaService,
  ) {}

  /**
   * 4-qatlamli entitlement tekshiruvi:
   * 1. School-level: ai module yoqilganmi?
   * 2. Role-level: rolda asosiy kirish huquqi bormi?
   * 3. User-level: UserEntitlement tier + features
   * 4. Quota-level: qolgan kvota bormi?
   */
  async canUseFeature(
    user: JwtPayload,
    feature: string,
  ): Promise<EntitlementCheckResult> {
    const schoolId = user.schoolId;
    if (!schoolId) {
      return { allowed: false, reason: 'Maktab identifikatori topilmadi' };
    }

    // Layer 1: School-level
    const config = await this.engagementConfig.getAll(schoolId);
    const aiEnabled = (config as any).ai_enabled ?? false;
    if (!aiEnabled) {
      return { allowed: false, reason: 'AI tizimi maktabda yoqilmagan' };
    }

    const featureEnabled = (config as any)[feature] ?? false;
    if (!featureEnabled) {
      return { allowed: false, reason: 'Bu xususiyat maktabda yoqilmagan' };
    }

    // Layer 2: Role-level (base access)
    const roleAccess = this.getRoleBaseAccess(user.role);
    if (!roleAccess.includes(feature)) {
      return { allowed: false, reason: 'Bu rol uchun ruxsat etilmagan' };
    }

    // Layer 3: User-level entitlement
    const userEntitlement = await this.prisma.userEntitlement.findUnique({
      where: { userId: user.sub },
    });
    const tier = userEntitlement?.tier ?? 'free';
    const features = (userEntitlement?.features as Record<string, boolean>) ?? {};

    if (features[feature] === false) {
      return { allowed: false, reason: 'Foydalanuvchi uchun bu xususiyat o‘chirilgan', tier };
    }

    // Layer 4: Quota-level (soft check — returns info but doesn't block)
    const quota = await this.quotaService.checkQuota(schoolId, feature);

    return {
      allowed: true,
      quotaRemaining: quota.remaining,
      tier,
    };
  }

  async getUserEntitlement(userId: string) {
    return this.prisma.userEntitlement.findUnique({
      where: { userId },
    });
  }

  async setUserEntitlement(
    userId: string,
    tier: string,
    features: Record<string, boolean>,
    expiresAt?: Date,
  ) {
    return this.prisma.userEntitlement.upsert({
      where: { userId },
      create: { userId, tier, features: features as any, expiresAt },
      update: { tier, features: features as any, expiresAt },
    });
  }

  private getRoleBaseAccess(role: string): string[] {
    const base: Record<string, string[]> = {
      director: [
        'ai_exam_generator',
        'ai_homework_review',
        'ai_parent_summary',
        'ai_tutor',
        'ai_insights',
        'ai_content_creator',
      ],
      vice_principal: [
        'ai_exam_generator',
        'ai_homework_review',
        'ai_parent_summary',
        'ai_tutor',
        'ai_insights',
        'ai_content_creator',
      ],
      teacher: ['ai_exam_generator', 'ai_homework_review', 'ai_content_creator'],
      class_teacher: ['ai_exam_generator', 'ai_homework_review', 'ai_content_creator'],
      student: ['ai_tutor', 'ai_insights'],
      parent: ['ai_parent_summary', 'ai_insights'],
      super_admin: [
        'ai_exam_generator',
        'ai_homework_review',
        'ai_parent_summary',
        'ai_tutor',
        'ai_insights',
        'ai_content_creator',
      ],
    };
    return base[role] ?? [];
  }
}
