import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EngagementConfigService } from './engagement-config.service';
import { AuditLogService } from '@/common/audit/audit-log.service';

@Injectable()
export class RecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementConfig: EngagementConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * O'quvchi tiklanish huquqiga ega bo'lganini tekshirish
   */
  async checkRecoveryEligibility(userId: string, schoolId: string): Promise<{
    eligible: boolean;
    reasons: string[];
    nextRecoveryAt?: Date;
  }> {
    const config = await this.engagementConfig.getAll(schoolId);
    if (!config.engagement_recovery_enabled) {
      return { eligible: false, reasons: ['Tiklanish tizimi yoqilmagan'] };
    }

    const rep = await this.prisma.engagementReputation.findUnique({ where: { userId } });
    if (!rep) {
      return { eligible: false, reasons: ['Reputatsiya ma‘lumoti topilmadi'] };
    }

    const reasons: string[] = [];

    if (rep.score >= 100) {
      reasons.push('Reputatsiya allaqachon maksimal');
    }

    if (!rep.lastDeductionAt) {
      reasons.push('Avval hisobdorlik qo‘llanilmagan');
    }

    // Oxirgi tiklanishdan keyin kamida 7 kun o'tishi kerak
    if (rep.recoveredAt) {
      const daysSinceRecovery = Math.floor(
        (Date.now() - rep.recoveredAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceRecovery < 7) {
        const nextDate = new Date(rep.recoveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        reasons.push(`Keyingi tiklanish: ${nextDate.toLocaleDateString('uz-UZ')}`);
        return { eligible: false, reasons, nextRecoveryAt: nextDate };
      }
    }

    if (reasons.length > 0) {
      return { eligible: false, reasons };
    }

    return { eligible: true, reasons: [] };
  }

  /**
   * Tiklanish mukofotini qo'llash
   */
  async applyRecovery(
    userId: string,
    schoolId: string,
    reason: string,
    triggeredBy: string,
  ): Promise<{ newScore: number; coinsAwarded: number }> {
    const config = await this.engagementConfig.getAll(schoolId);
    if (!config.engagement_recovery_enabled) {
      throw new BadRequestException('Tiklanish tizimi yoqilmagan');
    }

    const eligibility = await this.checkRecoveryEligibility(userId, schoolId);
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reasons.join('; '));
    }

    const recoveryRate = config.engagement_recovery_rate;
    const positiveRules = await this.engagementConfig.getPositiveRules(schoolId);

    return this.prisma.$transaction(async (tx) => {
      // Reputatsiyani yangilash
      const rep = await tx.engagementReputation.update({
        where: { userId },
        data: {
          score: { increment: 10 },
          consecutiveGood: { increment: 1 },
          recoveredAt: new Date(),
        },
      });

      // Coin mukofoti
      const user = await tx.user.findFirst({
        where: { id: userId, schoolId },
        select: { id: true, coins: true },
      });
      if (!user) throw new BadRequestException('Foydalanuvchi topilmadi');

      const coinReward = recoveryRate;
      const newBalance = user.coins + coinReward;

      await tx.user.update({
        where: { id: userId },
        data: { coins: newBalance },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          schoolId,
          amount: coinReward,
          type: 'earn',
          reason: 'recovery_bonus',
          balance: newBalance,
          metadata: { reason, recoveryRate } as any,
          comment: `Tiklanish: ${reason}`,
          awardedBy: triggeredBy,
        },
      });

      return { newScore: rep.score, coinsAwarded: coinReward };
    });
  }

  /**
   * Reputatsiyani yaxshilash (musbat harakatlar uchun avtomatik)
   */
  async improveReputation(
    userId: string,
    schoolId: string,
    points: number,
  ): Promise<void> {
    await this.prisma.engagementReputation.upsert({
      where: { userId },
      create: {
        userId,
        schoolId,
        score: Math.min(100, 100 + points),
        consecutiveGood: 1,
      },
      update: {
        score: { increment: points },
        consecutiveGood: { increment: 1 },
      },
    });
  }
}
