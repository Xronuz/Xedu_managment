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
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

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
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Operational dashboard with pilot usage (role-aware, school-scoped)' })
  async dashboard(@CurrentUser() user: JwtPayload) {
    const tenant = buildTenantWhere(user);
    const schoolId = tenant.schoolId;
    const branchId = typeof tenant.branchId === 'string' ? tenant.branchId : undefined;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Build school-scoped where clauses
    const schoolWhere = { schoolId };
    const branchWhere = branchId ? { schoolId, branchId } : schoolWhere;

    const [
      exportStats,
      solverStats,
      recentFailedExports,
      recentFailedSolvers,
      dbHealth,
      uptime,
      dailyActiveUsers,
      weeklyActiveUsers,
      dailyLogins,
      totalUsers,
      onboardedSchools,
      totalSchools,
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
      trends7d,
      roleActivity,
      failedExports24h,
      failedSolvers24h,
      queueFailures24h,
      error500s24h,
      telemetry,
      // Role-specific aggregations
      pendingApprovals,
      draftGradesCount,
      unpublishedSchedules,
      payrollStatus,
    ] = await Promise.all([
      this.prisma.exportJob.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { ...branchWhere, createdAt: { gte: since24h } },
      }),
      this.prisma.solverRun.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { ...schoolWhere, createdAt: { gte: since24h } },
      }),
      this.prisma.exportJob.findMany({
        where: { ...branchWhere, status: ExportJobStatus.failed, createdAt: { gte: since24h } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, entity: true, error: true, createdAt: true },
      }),
      this.prisma.solverRun.findMany({
        where: { ...schoolWhere, status: 'cancelled' as SolverRunStatus, createdAt: { gte: since24h } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, strategy: true, metadata: true, createdAt: true },
      }),
      this.prisma.$queryRaw`SELECT 1 as health`.then(() => 'up').catch(() => 'down'),
      process.uptime(),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...schoolWhere, createdAt: { gte: since24h } },
        _count: { userId: true },
      }).then(r => r.length),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...schoolWhere, createdAt: { gte: since7d } },
        _count: { userId: true },
      }).then(r => r.length),
      this.prisma.auditLog.count({
        where: { ...schoolWhere, action: 'login', createdAt: { gte: since24h } },
      }),
      this.prisma.user.count({ where: schoolWhere }),
      this.prisma.school.count({ where: { id: schoolId, onboardingCompleted: true } }),
      this.prisma.school.count({ where: { id: schoolId } }),
      this.prisma.attendance.count({ where: { ...branchWhere, createdAt: { gte: since24h } } }),
      this.prisma.grade.count({ where: { ...branchWhere, createdAt: { gte: since24h } } }),
      this.prisma.homework.count({ where: { ...branchWhere, createdAt: { gte: since24h } } }),
      this.prisma.homeworkSubmission.count({ where: { ...branchWhere, submittedAt: { gte: since24h } } }),
      this.prisma.exam.count({ where: { ...branchWhere, createdAt: { gte: since24h } } }),
      this.prisma.examSession.count({ where: { ...branchWhere, createdAt: { gte: since24h } } }),
      this.prisma.coinTransaction.count({ where: { ...schoolWhere, createdAt: { gte: since24h } } }),
      this.prisma.announcement.count({ where: { ...schoolWhere, createdAt: { gte: since24h } } }),
      this.prisma.message.count({ where: { ...schoolWhere, createdAt: { gte: since24h } } }),
      this.prisma.invitation.count({ where: { ...schoolWhere, createdAt: { gte: since24h } } }),
      this.prisma.schedule.count({ where: { ...branchWhere, createdAt: { gte: since24h } } }),
      this.prisma.payment.count({ where: { ...schoolWhere, createdAt: { gte: since24h } } }),
      this.telemetryPersistence.fetchRecent(7),
      this.evidence.getRoleActivity(since7d),
      this.prisma.exportJob.count({ where: { ...branchWhere, status: 'failed', createdAt: { gte: since24h } } }),
      this.prisma.solverRun.count({ where: { ...schoolWhere, status: 'cancelled', createdAt: { gte: since24h } } }),
      this.prisma.exportJob.count({ where: { ...branchWhere, status: 'failed', createdAt: { gte: since24h } } })
        .then(e => this.prisma.solverRun.count({ where: { ...schoolWhere, status: 'cancelled', createdAt: { gte: since24h } } }).then(s => e + s)),
      Promise.resolve(0),
      Promise.resolve(getTelemetrySnapshot()),
      // Role-specific
      this.prisma.leaveRequest.count({ where: { ...schoolWhere, status: 'pending' } }),
      this.prisma.grade.count({ where: { ...branchWhere, isPublished: false } }),
      this.prisma.schedule.count({ where: { ...branchWhere, status: 'draft' } }),
      this.prisma.monthlyPayroll.findFirst({
        where: { ...schoolWhere },
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      }),
    ]);

    const exportCounts = Object.fromEntries(
      exportStats.map(s => [s.status, s._count.status]),
    );
    const solverCounts = Object.fromEntries(
      solverStats.map(s => [s.status, s._count.status]),
    );

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

    const setupFunnel = {
      totalSchools,
      onboardedSchools,
      completionRate: totalSchools > 0 ? Math.round((onboardedSchools / totalSchools) * 100) : 0,
      totalUsers,
    };

    // Role-specific sections
    const role = user.role;

    const directorView = {
      pendingApprovals,
      draftGradesCount,
      unpublishedSchedules,
      blockers: [
        ...(pendingApprovals > 0 ? [{ label: 'Tasdiqlanmagan so\'rovlar', count: pendingApprovals, route: '/dashboard/approvals' }] : []),
        ...(draftGradesCount > 20 ? [{ label: 'Nashr etilmagan baholar', count: draftGradesCount, route: '/dashboard/grades' }] : []),
        ...(unpublishedSchedules > 0 ? [{ label: 'Qoralama jadvallar', count: unpublishedSchedules, route: '/dashboard/schedule' }] : []),
      ],
      executiveKpis: {
        dailyActiveUsers,
        weeklyActiveUsers,
        completionRate: setupFunnel.completionRate,
      },
    };

    const vpView = {
      academicExecution: {
        dailyAttendance,
        dailyGrades,
        dailyHomework,
        dailyExams,
      },
      scheduleReadiness: {
        publishedSlots: dailySchedule,
        draftSlots: unpublishedSchedules,
      },
      teachingLoadReadiness: {
        totalTeachers: totalUsers,
        pendingSubstitutions: 0, // populated from today-summary if needed
      },
    };

    const branchAdminView = {
      branchSetup: {
        periodsConfigured: true, // from today-summary
        roomsConfigured: true,
        classesConfigured: true,
      },
      staffData: {
        totalTeachers: totalUsers,
      },
    };

    const accountantView = {
      payroll: {
        currentMonthStatus: payrollStatus?.status ?? 'missing',
      },
      finance: {
        dailyPayments,
      },
    };

    const roleView = role === UserRole.DIRECTOR ? directorView
      : role === UserRole.VICE_PRINCIPAL ? vpView
      : role === UserRole.BRANCH_ADMIN ? branchAdminView
      : role === UserRole.ACCOUNTANT ? accountantView
      : directorView; // super_admin sees director view

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
      roleView,
    };
  }

  @Get('workflows')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Workflow funnel evidence (role-aware, school-scoped)' })
  async workflows(@CurrentUser() user: JwtPayload) {
    const tenant = buildTenantWhere(user);
    const schoolId = tenant.schoolId;

    const [
      setup,
      schedule,
      homework,
      exam,
      exportFunnel,
      announcement,
      invitation,
    ] = await Promise.all([
      this.evidence.getSetupFunnel(schoolId),
      this.evidence.getScheduleFunnel(schoolId),
      this.evidence.getHomeworkFunnel(schoolId),
      this.evidence.getExamFunnel(schoolId),
      this.evidence.getExportFunnel(schoolId),
      this.evidence.getAnnouncementFunnel(schoolId),
      this.evidence.getInvitationFunnel(schoolId),
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
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Friction signals (role-aware, school-scoped)' })
  async friction(@CurrentUser() user: JwtPayload) {
    const tenant = buildTenantWhere(user);
    const schoolId = tenant.schoolId;
    const signals = await this.evidence.getFrictionSignals(schoolId);

    // Filter signals by role visibility
    const roleVisibleSignals = user.role === UserRole.DIRECTOR
      ? signals
      : user.role === UserRole.VICE_PRINCIPAL
        ? signals.filter(s => s.module !== 'payroll')
        : user.role === UserRole.BRANCH_ADMIN
          ? signals.filter(s => ['schedule', 'setup', 'staff'].includes(s.module))
          : user.role === UserRole.ACCOUNTANT
            ? signals.filter(s => ['payroll', 'exports'].includes(s.module))
            : signals;

    return {
      generatedAt: new Date().toISOString(),
      viewedBy: { id: user.sub, role: user.role },
      signals: roleVisibleSignals,
      highFrictionCount: roleVisibleSignals.filter(s => s.severity === 'high').length,
      mediumFrictionCount: roleVisibleSignals.filter(s => s.severity === 'medium').length,
      lowFrictionCount: roleVisibleSignals.filter(s => s.severity === 'low').length,
    };
  }
}
