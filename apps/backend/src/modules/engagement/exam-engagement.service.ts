import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EngagementConfigService } from './engagement-config.service';
import { AchievementService } from './achievement.service';
import { AccountabilityService } from './accountability.service';
import { RecoveryService } from './recovery.service';

export interface ExamResultPayload {
  studentId: string;
  schoolId: string;
  examId: string;
  score: number;
  maxScore: number;
  subjectId?: string;
  triggeredBy: string;
}

export interface ExamEngagementResult {
  action: 'reward' | 'accountability' | 'neutral' | 'improvement_suggestion';
  coinsChanged?: number;
  achievementUnlocked?: { name: string; rewardCoins: number };
  message: string;
}

@Injectable()
export class ExamEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementConfig: EngagementConfigService,
    private readonly achievementService: AchievementService,
    private readonly accountabilityService: AccountabilityService,
    private readonly recoveryService: RecoveryService,
  ) {}

  /**
   * Imtihon natijasini engagement tizimida baholash
   */
  async evaluateExamResult(payload: ExamResultPayload): Promise<ExamEngagementResult> {
    const config = await this.engagementConfig.getAll(payload.schoolId);

    if (!config.engagement_enabled || !config.engagement_monthly_exam) {
      return { action: 'neutral', message: 'Imtihon engagement tizimi yoqilmagan' };
    }

    const thresholds = await this.engagementConfig.getThresholds(payload.schoolId);
    const percentage = (payload.score / payload.maxScore) * 100;

    // Musbat mukofot
    if (percentage >= thresholds.exam_high) {
      if (!config.engagement_positive) {
        return { action: 'neutral', message: 'Musbat mukofot tizimi yoqilmagan' };
      }

      const rules = await this.engagementConfig.getPositiveRules(payload.schoolId);
      const coinReward = rules.exam_high_score;

      // Coinlarni qo'shish
      const user = await this.prisma.user.findFirst({
        where: { id: payload.studentId, schoolId: payload.schoolId },
        select: { coins: true },
      });
      if (user) {
        await this.prisma.user.update({
          where: { id: payload.studentId },
          data: { coins: { increment: coinReward } },
        });
        await this.prisma.coinTransaction.create({
          data: {
            userId: payload.studentId,
            schoolId: payload.schoolId,
            amount: coinReward,
            type: 'earn',
            reason: 'exam_high_score',
            balance: user.coins + coinReward,
            metadata: { examId: payload.examId, score: payload.score, percentage } as any,
            awardedBy: payload.triggeredBy,
          },
        });
        await this.recoveryService.improveReputation(payload.studentId, payload.schoolId, 5);
      }

      // Mukofotni tekshirish
      const achievements = await this.achievementService.checkAndProgress(
        payload.studentId,
        payload.schoolId,
        'exam_high_score',
        { score: percentage },
      );

      return {
        action: 'reward',
        coinsChanged: coinReward,
        achievementUnlocked: achievements[0]
          ? { name: achievements[0].achievementName!, rewardCoins: achievements[0].rewardCoins! }
          : undefined,
        message: `A'lo natija! ${coinReward} coin mukofotlandi.`,
      };
    }

    // Hisobdorlik (past ball)
    if (percentage < thresholds.exam_low) {
      if (!config.engagement_accountability) {
        return {
          action: 'improvement_suggestion',
          message: "O'sish rejalashtirish tavsiya etiladi",
        };
      }

      const accountability = await this.accountabilityService.evaluateAccountability(
        payload.studentId,
        payload.schoolId,
        'exam_low_score',
        { score: percentage },
      );

      if (accountability.shouldDeduct && accountability.amount && accountability.reason) {
        await this.accountabilityService.recordDeduction(
          payload.studentId,
          payload.schoolId,
          accountability.reason,
          accountability.amount,
          payload.triggeredBy,
          `Imtihon: ${percentage.toFixed(1)}%`,
          { examId: payload.examId, score: payload.score, percentage },
        );

        return {
          action: 'accountability',
          coinsChanged: accountability.amount,
          message: `O'sish rejalashtirish tavsiya etiladi. Hisobdorlik: ${accountability.amount} coin.`,
        };
      }
    }

    return { action: 'neutral', message: 'Imtihon natijasi o\'rtacha' };
  }
}
