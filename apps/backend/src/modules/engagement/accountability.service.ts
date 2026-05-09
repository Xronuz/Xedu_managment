import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EngagementConfigService } from './engagement-config.service';
import { AuditLogService } from '@/common/audit/audit-log.service';
import { JwtPayload } from '@eduplatform/types';

export interface AccountabilityEvaluation {
  shouldDeduct: boolean;
  reason?: string;
  amount?: number;
  severity?: 'low' | 'medium' | 'high';
}

export interface RecoveryPath {
  action: string;
  description: string;
  reward: number;
  completed: boolean;
}

@Injectable()
export class AccountabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementConfig: EngagementConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Hodisani baholash va kerak bo'lsa hisobdorlik qo'llash
   */
  async evaluateAccountability(
    userId: string,
    schoolId: string,
    eventType: string,
    eventData?: Record<string, unknown>,
  ): Promise<AccountabilityEvaluation> {
    const config = await this.engagementConfig.getAll(schoolId);
    if (!config.engagement_accountability) {
      return { shouldDeduct: false };
    }

    const rules = await this.engagementConfig.getAccountabilityRules(schoolId);
    const thresholds = await this.engagementConfig.getThresholds(schoolId);

    switch (eventType) {
      case 'repeated_absence': {
        const absenceCount = eventData?.count as number;
        if (absenceCount !== undefined && absenceCount >= thresholds.absence_limit) {
          return {
            shouldDeduct: true,
            reason: 'repeated_absence',
            amount: rules.repeated_absence,
            severity: 'medium',
          };
        }
        break;
      }
      case 'repeated_lateness': {
        const latenessCount = eventData?.count as number;
        if (latenessCount !== undefined && latenessCount >= thresholds.lateness_limit) {
          return {
            shouldDeduct: true,
            reason: 'repeated_lateness',
            amount: rules.repeated_lateness,
            severity: 'low',
          };
        }
        break;
      }
      case 'exam_low_score': {
        const score = eventData?.score as number;
        if (score !== undefined && score < thresholds.exam_low) {
          return {
            shouldDeduct: true,
            reason: 'exam_low_score',
            amount: rules.exam_low_score,
            severity: 'medium',
          };
        }
        break;
      }
      case 'cheating_incident': {
        return {
          shouldDeduct: true,
          reason: 'cheating_incident',
          amount: rules.cheating_incident,
          severity: 'high',
        };
      }
      case 'severe_discipline': {
        return {
          shouldDeduct: true,
          reason: 'severe_discipline',
          amount: rules.severe_discipline,
          severity: 'high',
        };
      }
      default:
        break;
    }

    return { shouldDeduct: false };
  }

  /**
   * Hisobdorlik yozuvini yaratish
   */
  async recordDeduction(
    userId: string,
    schoolId: string,
    reason: string,
    amount: number,
    triggeredBy: string,
    comment: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const config = await this.engagementConfig.getAll(schoolId);
    if (!config.engagement_accountability) {
      throw new BadRequestException('Hisobdorlik tizimi yoqilmagan');
    }

    await this.prisma.$transaction(async (tx) => {
      // Balansni yangilash
      const user = await tx.user.findFirst({
        where: { id: userId, schoolId },
        select: { id: true, coins: true },
      });
      if (!user) throw new BadRequestException('Foydalanuvchi topilmadi');

      const deduct = Math.abs(amount);
      const newBalance = Math.max(0, user.coins - deduct);

      await tx.user.update({
        where: { id: userId },
        data: { coins: newBalance },
      });

      // Tranzaksiya yaratish
      await tx.coinTransaction.create({
        data: {
          userId,
          schoolId,
          amount: -deduct,
          type: 'deduct',
          reason: reason as any,
          balance: newBalance,
          metadata: metadata as any,
          comment,
          awardedBy: triggeredBy,
        },
      });

      // Reputatsiyani yangilash
      await tx.engagementReputation.upsert({
        where: { userId },
        create: {
          userId,
          schoolId,
          score: Math.max(0, 100 - deduct),
          consecutiveGood: 0,
          lastDeductionAt: new Date(),
        },
        update: {
          score: { decrement: deduct },
          consecutiveGood: 0,
          lastDeductionAt: new Date(),
        },
      });
    });

    // Audit log
    await this.auditLog.create({
      schoolId,
      userId: triggeredBy,
      action: 'update',
      entity: 'CoinTransaction',
      newData: { userId, reason, amount, comment, type: 'deduct' },
    });
  }

  /**
   * Tiklanish yo'lini olish
   */
  async getRecoveryPath(userId: string, schoolId: string): Promise<RecoveryPath[]> {
    const config = await this.engagementConfig.getAll(schoolId);
    if (!config.engagement_recovery_enabled) return [];

    const rep = await this.prisma.engagementReputation.findUnique({ where: { userId } });
    if (!rep || !rep.lastDeductionAt) return [];

    const recoveryRate = config.engagement_recovery_rate;
    const paths: RecoveryPath[] = [];

    // Davomat tiklanishi
    const recentAttendance = await this.prisma.attendance.findMany({
      where: { studentId: userId, date: { gte: rep.lastDeductionAt } },
      orderBy: { date: 'desc' },
      take: 5,
    });
    const presentCount = recentAttendance.filter((a) => a.status === 'present').length;
    paths.push({
      action: 'Davomat',
      description: "5 kundan 4 kuni vaqtida kelish",
      reward: recoveryRate,
      completed: presentCount >= 4,
    });

    // Uyga vazifa tiklanishi
    const recentHomework = await this.prisma.homeworkSubmission.findMany({
      where: { studentId: userId, submittedAt: { gte: rep.lastDeductionAt } },
      orderBy: { submittedAt: 'desc' },
      take: 3,
    });
    paths.push({
      action: "Uyga vazifa",
      description: "Ketma-ket 3 ta uyga vazifani topshirish",
      reward: recoveryRate,
      completed: recentHomework.length >= 3,
    });

    // Intizom tiklanishi
    const daysSinceDeduction = Math.floor(
      (Date.now() - rep.lastDeductionAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    paths.push({
      action: "Intizom",
      description: "30 kun davomida intizom buzilmagan holat",
      reward: recoveryRate * 2,
      completed: daysSinceDeduction >= 30,
    });

    return paths;
  }
}
