import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
}

@Injectable()
export class AiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async checkQuota(schoolId: string, feature: string): Promise<QuotaCheckResult> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const quota = await this.prisma.aiQuota.findUnique({
      where: {
        schoolId_feature_periodStart: {
          schoolId,
          feature,
          periodStart: startOfMonth,
        },
      },
    });

    if (!quota) {
      return { allowed: true, remaining: Infinity, limit: Infinity, used: 0 };
    }

    const remaining = Math.max(0, quota.limit - quota.used);
    return {
      allowed: remaining > 0,
      remaining,
      limit: quota.limit,
      used: quota.used,
    };
  }

  async consumeQuota(schoolId: string, feature: string, amount = 1): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await this.prisma.aiQuota.upsert({
      where: {
        schoolId_feature_periodStart: {
          schoolId,
          feature,
          periodStart: startOfMonth,
        },
      },
      create: {
        schoolId,
        feature,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        limit: 0,
        used: amount,
      },
      update: {
        used: { increment: amount },
      },
    });
  }

  async setQuotaLimit(schoolId: string, feature: string, limit: number): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await this.prisma.aiQuota.upsert({
      where: {
        schoolId_feature_periodStart: {
          schoolId,
          feature,
          periodStart: startOfMonth,
        },
      },
      create: {
        schoolId,
        feature,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        limit,
        used: 0,
      },
      update: {
        limit,
      },
    });
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetQuotas(): Promise<void> {
    // Quotas auto-reset by periodStart uniqueness — old periods are simply not matched
    // This cron is a hook for any cleanup or notification logic
  }
}
