import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { ExportJobStatus } from '@prisma/client';
import { SolverRunStatus } from '@eduplatform/types';
import { getTelemetrySnapshot } from '@/common/telemetry/pilot-telemetry';
import { PilotTelemetryPersistenceService } from '@/common/telemetry/pilot-telemetry-persistence.service';
import { PilotEvidenceService } from '@/common/telemetry/pilot-evidence.service';

@ApiTags('ops')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ops')
export class OpsDashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telemetryPersistence: PilotTelemetryPersistenceService,
    private readonly evidence: PilotEvidenceService,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Operational dashboard with pilot usage (manager/admin only)' })
  async dashboard(@CurrentUser() user: JwtPayload) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      exportStats,
      solverStats,
      recentFailedExports,
      recentFailedSolvers,
      dbHealth,
      uptime,
      // ─── Pilot Usage Metrics ───────────────────────────────────────────────
      dailyActiveUsers,
      weeklyActiveUsers,
      dailyLogins,
      totalUsers,
      onboardedSchools,
      totalSchools,
      // ─── Module Activity (24h) ─────────────────────────────────────────────
      dailyAttendance,
      dailyGrades,
      dailyHomework,
      dailyHomeworkSubmissions,
      dailyExams,
      dailyExamSessions,
      dailyCoinTx,
      dailyAnnouncements,
      dailyMessages,
      dailyInvitations,
      dailySchedule,
      dailyPayments,
      // ─── 7d Trends ─────────────────────────────────────────────────────────
      trends7d,
      // ─── Role Activity ─────────────────────────────────────────────────────
      roleActivity,
      // ─── Failed Actions ────────────────────────────────────────────────────
      failedExports24h,
      failedSolvers24h,
      queueFailures24h,
      error500s24h,
      // ─── Telemetry Counters ────────────────────────────────────────────────
      telemetry,
    ] = await Promise.all([
      this.prisma.exportJob.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { createdAt: { gte: since24h } },
      }),
      this.prisma.solverRun.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { createdAt: { gte: since24h } },
      }),
      this.prisma.exportJob.findMany({
        where: { status: ExportJobStatus.failed, createdAt: { gte: since24h } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, entity: true, error: true, createdAt: true },
      }),
      this.prisma.solverRun.findMany({
        where: { status: 'cancelled' as SolverRunStatus, createdAt: { gte: since24h } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, strategy: true, metadata: true, createdAt: true },
      }),
      this.prisma.$queryRaw`SELECT 1 as health`.then(() => 'up').catch(() => 'down'),
      process.uptime(),
      // ─── Pilot Usage ───────────────────────────────────────────────────────
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since24h } },
        _count: { userId: true },
      }).then(r => r.length),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since7d } },
        _count: { userId: true },
      }).then(r => r.length),
      this.prisma.auditLog.count({
        where: { action: 'login', createdAt: { gte: since24h } },
      }),
      this.prisma.user.count(),
      this.prisma.school.count({ where: { onboardingCompleted: true } }),
      this.prisma.school.count(),
      // ─── Module Activity ───────────────────────────────────────────────────
      this.prisma.attendance.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.grade.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.homework.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.homeworkSubmission.count({ where: { submittedAt: { gte: since24h } } }),
      this.prisma.exam.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.examSession.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.coinTransaction.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.announcement.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.message.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.invitation.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.schedule.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.payment.count({ where: { createdAt: { gte: since24h } } }),
      // ─── 7d Trends ─────────────────────────────────────────────────────────
      this.telemetryPersistence.fetchRecent(7),
      // ─── Role Activity ─────────────────────────────────────────────────────
      this.evidence.getRoleActivity(since7d),
      // ─── Failed Actions ────────────────────────────────────────────────────
      this.prisma.exportJob.count({ where: { status: 'failed', createdAt: { gte: since24h } } }),
      this.prisma.solverRun.count({ where: { status: 'cancelled' as SolverRunStatus, createdAt: { gte: since24h } } }),
      this.prisma.exportJob.count({ where: { status: 'failed', createdAt: { gte: since24h } } })
        .then(e => this.prisma.solverRun.count({ where: { status: 'cancelled' as SolverRunStatus, createdAt: { gte: since24h } } }).then(s => e + s)),
      Promise.resolve(0), // error500s tracked in-memory only
      // ─── Telemetry ─────────────────────────────────────────────────────────
      Promise.resolve(getTelemetrySnapshot()),
    ]);

    const exportCounts = Object.fromEntries(
      exportStats.map(s => [s.status, s._count.status]),
    );
    const solverCounts = Object.fromEntries(
      solverStats.map(s => [s.status, s._count.status]),
    );

    // ─── Module Ranking ─────────────────────────────────────────────────────
    const moduleActivity = [
      { module: 'attendance', daily: dailyAttendance },
      { module: 'grades', daily: dailyGrades },
      { module: 'homework', daily: dailyHomework + dailyHomeworkSubmissions },
      { module: 'exams', daily: dailyExams + dailyExamSessions },
      { module: 'coins', daily: dailyCoinTx },
      { module: 'announcements', daily: dailyAnnouncements },
      { module: 'messaging', daily: dailyMessages },
      { module: 'invitations', daily: dailyInvitations },
      { module: 'schedule', daily: dailySchedule },
      { module: 'payments', daily: dailyPayments },
    ];
    const topModules = [...moduleActivity].sort((a, b) => b.daily - a.daily).slice(0, 5);
    const lowModules = [...moduleActivity].sort((a, b) => a.daily - b.daily).slice(0, 5);

    // ─── Setup Funnel ───────────────────────────────────────────────────────
    const setupFunnel = {
      totalSchools,
      onboardedSchools,
      completionRate: totalSchools > 0 ? Math.round((onboardedSchools / totalSchools) * 100) : 0,
      totalUsers,
    };

    return {
      generatedAt: new Date().toISOString(),
      viewedBy: { id: user.sub, role: user.role },
      system: {
        uptimeSeconds: Math.floor(uptime),
        nodeEnv: process.env.NODE_ENV || 'development',
        dbHealth,
        memoryMb: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      },
      backlog: {
        exports: {
          queued: exportCounts['queued'] || 0,
          processing: exportCounts['processing'] || 0,
          completed: exportCounts['completed'] || 0,
          failed: exportCounts['failed'] || 0,
        },
        solvers: {
          running: solverCounts['running'] || 0,
          completed: solverCounts['completed'] || 0,
          cancelled: solverCounts['cancelled'] || 0,
        },
      },
      recentFailures: {
        exports: recentFailedExports.map(e => ({
          id: e.id,
          entity: e.entity,
          error: e.error,
          time: e.createdAt,
        })),
        solvers: recentFailedSolvers.map(s => ({
          id: s.id,
          strategy: s.strategy,
          error: (s.metadata as any)?.error || 'Unknown',
          time: s.createdAt,
        })),
      },
      pilotUsage: {
        activity: {
          dailyActiveUsers,
          weeklyActiveUsers,
          dailyLogins,
        },
        topModules,
        lowModules,
        setupFunnel,
        trends7d: trends7d.map(t => ({
          date: t.date.toISOString().slice(0, 10),
          logins: t.logins,
          exports: t.exports,
          solverRuns: t.solverRuns,
          queueFailures: t.queueFailures,
          error500s: t.error500s,
        })),
        roleActivity,
        failedActions: {
          failedExports24h,
          failedSolvers24h,
          queueFailures24h,
          error500s24h,
        },
        telemetry,
      },
    };
  }

  @Get('workflows')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Workflow funnel evidence (manager/admin only)' })
  async workflows(@CurrentUser() user: JwtPayload) {
    const [
      setup,
      schedule,
      homework,
      exam,
      exportFunnel,
      announcement,
      invitation,
    ] = await Promise.all([
      this.evidence.getSetupFunnel(),
      this.evidence.getScheduleFunnel(),
      this.evidence.getHomeworkFunnel(),
      this.evidence.getExamFunnel(),
      this.evidence.getExportFunnel(),
      this.evidence.getAnnouncementFunnel(),
      this.evidence.getInvitationFunnel(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      viewedBy: { id: user.sub, role: user.role },
      workflows: [setup, schedule, homework, exam, exportFunnel, announcement, invitation],
      brokenFunnels: [setup, schedule, homework, exam, exportFunnel, announcement, invitation]
        .filter(w => !w.healthy)
        .map(w => ({ name: w.name, note: w.note })),
    };
  }

  @Get('friction')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Friction signals (manager/admin only)' })
  async friction(@CurrentUser() user: JwtPayload) {
    const signals = await this.evidence.getFrictionSignals();

    return {
      generatedAt: new Date().toISOString(),
      viewedBy: { id: user.sub, role: user.role },
      signals,
      highFrictionCount: signals.filter(s => s.severity === 'high').length,
      mediumFrictionCount: signals.filter(s => s.severity === 'medium').length,
      lowFrictionCount: signals.filter(s => s.severity === 'low').length,
    };
  }
}
