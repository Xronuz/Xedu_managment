import { Controller, Get, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck, HealthCheckService, PrismaHealthIndicator,
  MemoryHealthIndicator, HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { NotificationQueueService } from '@/modules/notifications/notification-queue.service';
import { Public } from '@/common/decorators/public.decorator';
import { ExportJobStatus } from '@prisma/client';
import { SolverRunStatus } from '@eduplatform/types';
import * as fs from 'fs';

// Lightweight in-memory metrics (no external vendor)
interface MetricsSnapshot {
  uptimeSeconds: number;
  memory: NodeJS.MemoryUsage;
  timestamp: string;
}
let lastMetrics: MetricsSnapshot | null = null;
let requestCount = 0;
let errorCount = 0;

export function recordRequest() { requestCount++; }
export function recordError() { errorCount++; }
export function getMetrics(): MetricsSnapshot {
  lastMetrics = {
    uptimeSeconds: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };
  return lastMetrics;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaIndicator: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
    @Optional() private readonly redis: RedisService,
    @Optional() private readonly notificationQueue: NotificationQueueService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check (liveness)' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // PrismaHealthIndicator types accept the bare PrismaClient generic.
      // Our PrismaService extends PrismaClient at runtime but Prisma v6's
      // structural type widens the missing methods — cast to any is safe here.
      () => this.prismaIndicator.pingCheck('database', this.prisma as any),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      // Redis — ixtiyoriy, mavjud bo'lmasa degraded holat, crash emas
      async () => {
        if (!this.redis) {
          return { redis: { status: 'up', message: 'not configured' } };
        }
        try {
          const pong = await Promise.race([
            this.redis.ping(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 2000),
            ),
          ]);
          return { redis: { status: 'up', pong } };
        } catch (err: any) {
          // Redis down bo'lsa health check fail qilmasin — degraded deb belgilaydi
          return { redis: { status: 'up', message: `degraded: ${err.message}` } };
        }
      },
      async () => {
        if (!this.notificationQueue) {
          return { queue: { status: 'up', message: 'not configured' } };
        }
        try {
          const stats = await this.notificationQueue.getQueueStats();
          if (!stats) {
            return { queue: { status: 'up', message: 'not configured' } };
          }
          if (!stats.isHealthy) {
            return { queue: { status: 'down', message: `failed: ${stats.failed}, waiting: ${stats.waiting}` } };
          }
          return { queue: { status: 'up', waiting: stats.waiting, active: stats.active, failed: stats.failed } };
        } catch (err: any) {
          return { queue: { status: 'up', message: `degraded: ${err.message}` } };
        }
      },
    ]);
  }

  @Get('metrics')
  @Public()
  @ApiOperation({ summary: 'Basic operational metrics' })
  metrics() {
    const m = getMetrics();
    return {
      uptimeSeconds: m.uptimeSeconds,
      memory: {
        rssMb: Math.round(m.memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(m.memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(m.memory.heapTotal / 1024 / 1024),
        externalMb: Math.round(m.memory.external / 1024 / 1024),
      },
      requestsSinceStart: requestCount,
      errorsSinceStart: errorCount,
      timestamp: m.timestamp,
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check with dependency health' })
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma as any),
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024),
      async () => {
        // Disk pressure check — require 500MB free
        try {
          const stats = await fs.promises.statfs('/');
          const freeBytes = stats.bavail * stats.bsize;
          const minFree = 500 * 1024 * 1024; // 500MB
          if (freeBytes < minFree) {
            return { disk: { status: 'down', message: `Only ${Math.round(freeBytes / 1024 / 1024)}MB free (need 500MB)` } };
          }
          return { disk: { status: 'up', freeMb: Math.round(freeBytes / 1024 / 1024) } };
        } catch (err: any) {
          return { disk: { status: 'down', message: err.message } };
        }
      },
      async () => {
        // Env validation
        const required = ['DATABASE_URL', 'JWT_SECRET'];
        const missing = required.filter(k => !process.env[k]);
        if (missing.length > 0) {
          return { env: { status: 'down', message: `Missing: ${missing.join(', ')}` } };
        }
        return { env: { status: 'up' } };
      },
      async () => {
        // Queue backlog check
        const [exportFailed, solverFailed] = await Promise.all([
          this.prisma.exportJob.count({ where: { status: ExportJobStatus.failed } }),
          this.prisma.solverRun.count({ where: { status: SolverRunStatus.CANCELLED } }),
        ]);
        if (exportFailed > 50 || solverFailed > 20) {
          return { queue_backlog: { status: 'down', message: `exports_failed=${exportFailed}, solver_cancelled=${solverFailed}` } };
        }
        return { queue_backlog: { status: 'up', exports_failed: exportFailed, solver_cancelled: solverFailed } };
      },
    ]);
  }
}
