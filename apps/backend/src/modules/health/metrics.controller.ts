import { Controller, Get, Header } from '@nestjs/common';
import { getTelemetrySnapshot } from '@/common/telemetry/pilot-telemetry';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ExportJobStatus } from '@prisma/client';
import { SolverRunStatus } from '@eduplatform/types';

/**
 * Prometheus-compatible lightweight metrics endpoint.
 * No external SaaS vendors. Text format for easy scraping.
 */

let requestCount = 0;
let errorCount = 0;

export function recordRequestMetric() { requestCount++; }
export function recordErrorMetric() { errorCount++; }

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus-compatible metrics' })
  async metrics(): Promise<string> {
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    const now = Date.now();

    // Queue/job counts from Prisma (lightweight, no Redis required)
    const [
      exportQueued,
      exportProcessing,
      exportCompleted,
      exportFailed,
      solverRunning,
      solverCompleted,
      solverFailed,
    ] = await Promise.all([
      this.prisma.exportJob.count({ where: { status: ExportJobStatus.queued } }),
      this.prisma.exportJob.count({ where: { status: ExportJobStatus.processing } }),
      this.prisma.exportJob.count({ where: { status: ExportJobStatus.completed } }),
      this.prisma.exportJob.count({ where: { status: ExportJobStatus.failed } }),
      this.prisma.solverRun.count({ where: { status: SolverRunStatus.RUNNING } }),
      this.prisma.solverRun.count({ where: { status: SolverRunStatus.COMPLETED } }),
      this.prisma.solverRun.count({ where: { status: SolverRunStatus.CANCELLED } }),
    ]);

    const lines: string[] = [
      '# HELP eduplatform_uptime_seconds Process uptime in seconds',
      '# TYPE eduplatform_uptime_seconds gauge',
      `eduplatform_uptime_seconds ${uptime.toFixed(3)}`,
      '',
      '# HELP eduplatform_memory_bytes Memory usage in bytes',
      '# TYPE eduplatform_memory_bytes gauge',
      `eduplatform_memory_bytes{type="rss"} ${mem.rss}`,
      `eduplatform_memory_bytes{type="heapUsed"} ${mem.heapUsed}`,
      `eduplatform_memory_bytes{type="heapTotal"} ${mem.heapTotal}`,
      '',
      '# HELP eduplatform_requests_total Total HTTP requests since start',
      '# TYPE eduplatform_requests_total counter',
      `eduplatform_requests_total ${requestCount}`,
      '',
      '# HELP eduplatform_errors_total Total HTTP 5xx errors since start',
      '# TYPE eduplatform_errors_total counter',
      `eduplatform_errors_total ${errorCount}`,
      '',
      '# HELP eduplatform_export_jobs_total Export jobs by status',
      '# TYPE eduplatform_export_jobs_total gauge',
      `eduplatform_export_jobs_total{status="queued"} ${exportQueued}`,
      `eduplatform_export_jobs_total{status="processing"} ${exportProcessing}`,
      `eduplatform_export_jobs_total{status="completed"} ${exportCompleted}`,
      `eduplatform_export_jobs_total{status="failed"} ${exportFailed}`,
      '',
      '# HELP eduplatform_solver_runs_total Solver runs by status',
      '# TYPE eduplatform_solver_runs_total gauge',
      `eduplatform_solver_runs_total{status="running"} ${solverRunning}`,
      `eduplatform_solver_runs_total{status="completed"} ${solverCompleted}`,
      `eduplatform_solver_runs_total{status="cancelled"} ${solverFailed}`,
      '',
      '# HELP eduplatform_info Platform info',
      '# TYPE eduplatform_info gauge',
      `eduplatform_info{version="1.0.0",env="${process.env.NODE_ENV || 'development'}"} 1`,
      '',
      '# HELP eduplatform_pilot_telemetry Pilot usage counters',
      '# TYPE eduplatform_pilot_telemetry counter',
    ];

    const t = getTelemetrySnapshot();
    const telemetryLines = [
      `eduplatform_pilot_telemetry{metric="login_count"} ${t.loginCount}`,
      `eduplatform_pilot_telemetry{metric="setup_completion"} ${t.setupCompletionCount}`,
      `eduplatform_pilot_telemetry{metric="schedule_generation"} ${t.scheduleGenerationCount}`,
      `eduplatform_pilot_telemetry{metric="solver_runs"} ${t.solverRunCount}`,
      `eduplatform_pilot_telemetry{metric="export_jobs"} ${t.exportJobCount}`,
      `eduplatform_pilot_telemetry{metric="attendance_actions"} ${t.attendanceActionCount}`,
      `eduplatform_pilot_telemetry{metric="grade_publishes"} ${t.gradePublishCount}`,
      `eduplatform_pilot_telemetry{metric="homework_submissions"} ${t.homeworkSubmissionCount}`,
      `eduplatform_pilot_telemetry{metric="exam_submissions"} ${t.examSubmissionCount}`,
      `eduplatform_pilot_telemetry{metric="coin_transactions"} ${t.coinTransactionCount}`,
      `eduplatform_pilot_telemetry{metric="announcement_reads"} ${t.announcementReadCount}`,
      `eduplatform_pilot_telemetry{metric="invitation_accepts"} ${t.invitationAcceptCount}`,
      `eduplatform_pilot_telemetry{metric="queue_failures"} ${t.queueFailureCount}`,
      `eduplatform_pilot_telemetry{metric="500_errors"} ${t.error500Count}`,
    ];

    lines.push(...telemetryLines);

    return lines.join('\n');
  }
}
