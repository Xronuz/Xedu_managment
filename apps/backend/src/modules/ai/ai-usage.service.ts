import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface LogUsagePayload {
  schoolId: string;
  userId: string;
  feature: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  costUsd: number;
  status: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async logUsage(payload: LogUsagePayload): Promise<void> {
    await this.prisma.aiUsage.create({
      data: {
        schoolId: payload.schoolId,
        userId: payload.userId,
        feature: payload.feature,
        provider: payload.provider,
        model: payload.model,
        tokensIn: payload.tokensIn,
        tokensOut: payload.tokensOut,
        latencyMs: payload.latencyMs,
        costUsd: payload.costUsd,
        status: payload.status,
        metadata: payload.metadata as any,
      },
    });
  }

  async getUsageSummary(schoolId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalRequests,
      totalTokens,
      totalCost,
      avgLatency,
      byFeature,
      byProvider,
    ] = await Promise.all([
      this.prisma.aiUsage.count({ where: { schoolId, createdAt: { gte: since } } }),
      this.prisma.aiUsage.aggregate({
        where: { schoolId, createdAt: { gte: since } },
        _sum: { tokensIn: true, tokensOut: true },
      }),
      this.prisma.aiUsage.aggregate({
        where: { schoolId, createdAt: { gte: since } },
        _sum: { costUsd: true },
      }),
      this.prisma.aiUsage.aggregate({
        where: { schoolId, createdAt: { gte: since }, status: 'success' },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiUsage.groupBy({
        by: ['feature'],
        where: { schoolId, createdAt: { gte: since } },
        _count: true,
        _sum: { tokensIn: true, tokensOut: true, costUsd: true },
      }),
      this.prisma.aiUsage.groupBy({
        by: ['provider'],
        where: { schoolId, createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    return {
      totalRequests,
      totalTokens: (totalTokens._sum.tokensIn ?? 0) + (totalTokens._sum.tokensOut ?? 0),
      totalCost: totalCost._sum.costUsd ?? 0,
      avgLatency: Math.round((avgLatency._avg.latencyMs ?? 0) * 10) / 10,
      byFeature: byFeature.map((f) => ({
        feature: f.feature,
        requests: f._count,
        tokens: (f._sum.tokensIn ?? 0) + (f._sum.tokensOut ?? 0),
        cost: f._sum.costUsd ?? 0,
      })),
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        requests: p._count,
      })),
    };
  }

  async getUserUsage(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.aiUsage.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getFeatureUsage(schoolId: string, feature: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.aiUsage.findMany({
      where: { schoolId, feature, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getCostEstimate(schoolId: string, days = 30): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.prisma.aiUsage.aggregate({
      where: { schoolId, createdAt: { gte: since } },
      _sum: { costUsd: true },
    });
    return result._sum.costUsd ?? 0;
  }
}
