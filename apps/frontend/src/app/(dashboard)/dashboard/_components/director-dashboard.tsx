'use client';

import { useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ArrowUpRight, Activity, Users, Building2,
  Calendar, GraduationCap, BarChart3, Zap, Clock, CalendarPlus,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatUzDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

import { usersApi } from '@/lib/api/users';
import { attendanceApi } from '@/lib/api/attendance';
import { examsApi } from '@/lib/api/exams';
import { kpiApi } from '@/lib/api/kpi';
import { branchesApi } from '@/lib/api/branches';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { opsCommandCenterApi } from '@/lib/api/ops-command-center';
import { academicCalendarApi } from '@/lib/api/academic-calendar';

import {
  WorkspaceShell,
  WorkspaceHeader,
  WorkspaceMain,
  WorkspaceSidebar,
  WorkspaceSection,
} from '@/components/workspace-system';

/* ═══════════════════════════════════════════════════════════════════════════════
   DIREKTOR DASHBOARD
   Zone A: 3 executive kartalar (salomatlik, tasdiqlashlar, ogohlantirishlar)
   Zone B: yaqin tadbirlar + bugungi jonli holat (ops today-summary)
   Zone C: 4 metrika (o'quvchi, o'qituvchi, davomat, filiallar)
   ═══════════════════════════════════════════════════════════════════════════════ */

export function DirectorDashboard() {
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  const schoolId = user?.schoolId;

  // ── Ops Command Center APIs ───────────────────────────────────────────────────
  const { data: readinessData, isLoading: readinessLoading } = useQuery({
    queryKey: ['ops', 'readiness', schoolId],
    queryFn: () => (schoolId ? opsCommandCenterApi.getReadiness(schoolId) : Promise.resolve(null)),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId,
  });
  const { data: opsAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['ops', 'alerts', activeBranchId],
    queryFn: () => opsCommandCenterApi.getAlerts(activeBranchId ?? undefined),
    enabled: !!activeBranchId,
    staleTime: 60_000,
  });
  const { data: todaySummary, isLoading: todayLoading } = useQuery({
    queryKey: ['ops', 'today-summary', activeBranchId],
    queryFn: () => opsCommandCenterApi.getTodaySummary(activeBranchId ?? undefined),
    enabled: !!activeBranchId,
    staleTime: 60_000,
  });

  // ── Academic Calendar (next 30 days) ──────────────────────────────────────────
  const dateRange = useMemo(() => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    return {
      from: today.toISOString().split('T')[0],
      to: nextMonth.toISOString().split('T')[0],
    };
  }, []);
  const { data: academicEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['academic-calendar', 'upcoming', dateRange.from, dateRange.to],
    queryFn: () => academicCalendarApi.getAll(dateRange),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Existing APIs ─────────────────────────────────────────────────────────────
  const { data: attendanceSummary, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'today-summary', 'school-wide'],
    queryFn: attendanceApi.getTodaySummary,
    staleTime: 5 * 60 * 1000,
  });
  const { data: usersData } = useQuery({
    queryKey: ['users', 'all', 'school-wide'],
    queryFn: () => usersApi.getAll({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: pendingLeaves } = useQuery({
    queryKey: ['leave-requests', 'pending', 'school-wide'],
    queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: pendingDiscipline } = useQuery({
    queryKey: ['discipline', 'unresolved', 'school-wide'],
    queryFn: () => disciplineApi.getAll().catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });
  const { data: kpiData } = useQuery({
    queryKey: ['kpi', 'dashboard', 'dir'],
    queryFn: () => kpiApi.getDashboard().catch(() => ({ metrics: [], byCategory: {}, overallScore: null })),
    staleTime: 60_000,
  });
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', 'director'],
    queryFn: () => branchesApi.getAll().catch(() => []),
    staleTime: 60_000,
  });
  const { data: upcomingExamsData } = useQuery({
    queryKey: ['exams', 'upcoming', 'school-wide'],
    queryFn: () => examsApi.getUpcoming(7).catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  // ── Derived data ──────────────────────────────────────────────────────────────
  const allUsers: any[] = useMemo(() => (usersData as any)?.data ?? [], [usersData]);
  const teacherCount = useMemo(
    () => allUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length,
    [allUsers],
  );
  const studentCount = useMemo(
    () => allUsers.filter((u: any) => u.role === 'student').length,
    [allUsers],
  );
  const staffCount = useMemo(
    () => allUsers.filter((u: any) => !['student', 'teacher', 'class_teacher', 'parent'].includes(u.role)).length,
    [allUsers],
  );
  const pendingLeaveList: any[] = useMemo(
    () => (pendingLeaves as any)?.data ?? pendingLeaves ?? [],
    [pendingLeaves],
  );
  const pendingDisciplineList: any[] = useMemo(
    () => (pendingDiscipline as any)?.data ?? [],
    [pendingDiscipline],
  );
  const presentPct = (attendanceSummary as any)?.presentPct ?? 0;
  const attMarked = (attendanceSummary as any)?.marked ?? 0;
  const attTotal = (attendanceSummary as any)?.totalStudents ?? 0;
  const upcomingExamsCount = Array.isArray(upcomingExamsData) ? upcomingExamsData.length : 0;

  const alertList = opsAlerts ?? [];
  const criticalAlerts = alertList.filter((a) => a.severity === 'critical').length;
  const warningAlerts = alertList.filter((a) => a.severity === 'warning').length;

  const dayLabel = useMemo(() => formatUzDate(new Date(), { weekday: true }), []);

  const readinessScore = readinessData?.score ?? 0;
  const readinessStatus = readinessData?.status ?? 'not_started';
  const pendingApprovals = todaySummary?.staff?.pendingLeaveRequests ?? 0;

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="w-full lg:col-span-2 space-y-1">
        <WorkspaceHeader
          title="Direktor paneli"
          subtitle={`Maktab umumiy holati · ${dayLabel}`}
          icon={<LayoutDashboard className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push('/dashboard/ops')}
            >
              <Zap className="h-4 w-4" />
              Operatsion markaz
            </Button>
          }
        />
      </div>

      <WorkspaceMain>
        <div className="space-y-5">

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE A — EXECUTIVE SNAPSHOT (3 cards)
             ═══════════════════════════════════════════════════════════════════ */}
          <SectionLabel title="Umumiy ko'rinish" icon={BarChart3} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* 1. School Health */}
            <ExecCard
              title="Maktab salomatligi"
              href="/dashboard/ops"
              footer={!readinessLoading && readinessScore < 80 ? (
                <span className="text-xs font-medium text-xedu-primary group-hover:underline">
                  Sozlashni davom ettirish →
                </span>
              ) : null}
            >
              {readinessLoading ? (
                <Skeleton className="h-11 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <ReadinessRing score={readinessScore} />
                  <div className="min-w-0 space-y-1">
                    <StatusBadge status={readinessStatus} />
                    <p className="text-xs text-xedu-slate-500">
                      {readinessScore >= 80 ? 'Maktab yaxshi holatda' :
                       readinessScore >= 60 ? "E'tibor talab etadi" : 'Jiddiy muammo bor'}
                    </p>
                  </div>
                </div>
              )}
            </ExecCard>

            {/* 2. Approvals */}
            <ExecCard
              title="Tasdiqlashlar"
              href="/dashboard/approvals"
            >
              {todayLoading ? (
                <Skeleton className="h-11 w-full" />
              ) : (
                <div className="space-y-1.5">
                  {pendingApprovals > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black tabular-nums text-xedu-slate-900 dark:text-xedu-slate-100">
                        {pendingApprovals}
                      </span>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-xedu-amber-100 text-xedu-amber-700 dark:bg-xedu-amber-900/30 dark:text-xedu-amber-400">
                        Kutilmoqda
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-xedu-emerald-600 dark:text-xedu-emerald-400">
                      Hamma tasdiqlangan
                    </p>
                  )}
                  <p className="text-xs text-xedu-slate-500">Ta&apos;til so&apos;rovlari</p>
                </div>
              )}
            </ExecCard>

            {/* 3. Alerts */}
            <ExecCard
              title="Ogohlantirishlar"
              href="/dashboard/alerts"
              className="col-span-2 sm:col-span-1"
            >
              {alertsLoading ? (
                <Skeleton className="h-11 w-full" />
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'text-2xl font-black tabular-nums',
                      criticalAlerts > 0 ? 'text-xedu-ruby-600 dark:text-xedu-ruby-400' : 'text-xedu-slate-900 dark:text-xedu-slate-100',
                    )}>
                      {alertList.length}
                    </span>
                    {alertList.length > 0 && (
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-xedu-ruby-100 text-xedu-ruby-700 dark:bg-xedu-ruby-900/30 dark:text-xedu-ruby-400">
                        Yangi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-xedu-slate-500">
                    {alertList.length === 0
                      ? 'Hamma yaxshi'
                      : [
                          criticalAlerts > 0 ? `${criticalAlerts} jiddiy` : null,
                          warningAlerts > 0 ? `${warningAlerts} ogohlantirish` : null,
                        ].filter(Boolean).join(' · ') || "Ko'rib chiqish kerak"}
                  </p>
                </div>
              )}
            </ExecCard>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE B — UPCOMING EVENTS + TODAY LIVE STATUS
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            {/* Qism 1 — Academic Calendar (60%) */}
            <div className="col-span-2 lg:col-span-3 rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 px-3 md:px-4 py-3 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
                <Calendar className="h-4 w-4 text-xedu-slate-500 shrink-0" />
                <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100 truncate">Yaqin tadbirlar</h3>
              </div>
              <div className="px-3 md:px-4 py-3 flex-1">
                {eventsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : ((academicEvents as any[])?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    {(academicEvents as any[]).slice(0, 5).map((evt: any) => (
                      <div key={evt.id} className="flex items-center gap-3 py-1.5">
                        <div className={cn('h-2 w-2 rounded-full shrink-0', EVENT_TYPE_DOT[evt.type] ?? EVENT_TYPE_DOT.other)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-xedu-slate-800 dark:text-xedu-slate-200 truncate">{evt.title}</p>
                        </div>
                        <span className="text-xs text-xedu-slate-500 shrink-0 tabular-nums">
                          {formatUzDate(evt.startDate, { short: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                    <CalendarPlus className="h-7 w-7 text-xedu-slate-300" />
                    <p className="text-sm text-xedu-slate-500">Yaqin 30 kunda tadbirlar rejalanmagan</p>
                    <Link
                      href="/dashboard/academic-calendar"
                      className="text-xs font-medium text-xedu-primary hover:underline"
                    >
                      Tadbir qo&apos;shish →
                    </Link>
                  </div>
                )}
              </div>
              {((academicEvents as any[])?.length ?? 0) > 0 && (
                <div className="px-3 md:px-4 pb-3">
                  <Link href="/dashboard/academic-calendar" className="text-xs font-medium text-xedu-primary hover:underline">
                    Barchasi →
                  </Link>
                </div>
              )}
            </div>

            {/* Qism 2 — Today live status (40%) */}
            <div className="col-span-2 lg:col-span-2 rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
              <div className="flex items-center gap-2 px-3 md:px-4 py-3 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
                <Clock className="h-4 w-4 text-xedu-slate-500 shrink-0" />
                <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100 truncate">Bugun maktabda</h3>
              </div>
              <div className="px-3 md:px-4 py-3">
                {todayLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : todaySummary ? (
                  <div className="space-y-3">
                    <TodayRow
                      tone={todaySummary.staff.teachersAbsent > 0 ? 'attention' : 'success'}
                      title="O'qituvchilar"
                      detail={
                        todaySummary.staff.teachersAbsent > 0
                          ? `${todaySummary.staff.teachersPresent} darsda · ${todaySummary.staff.teachersAbsent} yo'q`
                          : `${todaySummary.staff.teachersPresent} darsda, hamma joyida`
                      }
                    />
                    <TodayRow
                      tone={todaySummary.schedule.conflicts > 0 ? 'urgent' : todaySummary.schedule.publishedSlots > 0 ? 'success' : 'muted'}
                      title="Dars jadvali"
                      detail={
                        todaySummary.schedule.conflicts > 0
                          ? `${todaySummary.schedule.conflicts} ta to'qnashuv bor`
                          : todaySummary.schedule.publishedSlots > 0
                            ? `${todaySummary.schedule.publishedSlots} ta dars nashrda`
                            : 'Jadval nashr qilinmagan'
                      }
                    />
                    <TodayRow
                      tone={attMarked > 0 ? 'success' : 'muted'}
                      title="Davomat"
                      detail={attMarked > 0 ? `${attMarked}/${attTotal} o'quvchi belgilandi` : 'Hali belgilanmagan'}
                    />
                    {(todaySummary.substitutions.activeToday > 0 || todaySummary.substitutions.pendingProposals > 0) && (
                      <TodayRow
                        tone="attention"
                        title="O'rinbosarlik"
                        detail={[
                          todaySummary.substitutions.activeToday > 0 ? `${todaySummary.substitutions.activeToday} ta bugun` : null,
                          todaySummary.substitutions.pendingProposals > 0 ? `${todaySummary.substitutions.pendingProposals} ta kutilmoqda` : null,
                        ].filter(Boolean).join(' · ')}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-xedu-slate-500 py-2">Ma&apos;lumot hozircha yo&apos;q</p>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE C — 4 METRICS
             ═══════════════════════════════════════════════════════════════════ */}
          <SectionLabel title="Asosiy ko'rsatkichlar" icon={BarChart3} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              href="/dashboard/users"
              icon={GraduationCap}
              label="O'quvchilar"
              isLoading={!usersData}
              value={String(studentCount)}
            />
            <MetricCard
              href="/dashboard/staff"
              icon={Users}
              label="O'qituvchilar"
              isLoading={!usersData}
              value={String(teacherCount)}
            />
            <MetricCard
              href="/dashboard/attendance"
              icon={Activity}
              label="Davomat"
              isLoading={attLoading}
              value={attMarked > 0 ? `${presentPct}%` : '—'}
              valueClassName={attMarked > 0 && presentPct < 80 ? 'text-xedu-amber-600 dark:text-xedu-amber-400' : undefined}
              sub={attMarked > 0 ? `${attMarked}/${attTotal} belgilandi` : 'Hali belgilanmagan'}
            >
              {attMarked > 0 && (
                <div className="mt-2 h-1 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none',
                      presentPct < 80 ? 'bg-xedu-amber-500' : 'bg-xedu-emerald-500',
                    )}
                    style={{ width: `${Math.min(presentPct, 100)}%` }}
                  />
                </div>
              )}
            </MetricCard>
            <MetricCard
              href="/dashboard/branches"
              icon={Building2}
              label="Filiallar"
              isLoading={branchesLoading}
              value={String((branches as any[])?.length ?? 0)}
            />
          </div>

        </div>
      </WorkspaceMain>

      {/* ── Right Sidebar ───────────────────────────────────────────────────── */}
      <WorkspaceSidebar width="normal">
        <div className="space-y-3">
          <KpiSnapshotCard kpiData={kpiData} />

          <WorkspaceSection
            title="So'nggi operatsiyalar"
            icon={<Activity className="h-4 w-4" />}
            density="compact"
          >
            <RecentOperationsSummary
              pendingLeaves={pendingLeaveList.length}
              pendingDiscipline={pendingDisciplineList.length}
              upcomingExams={upcomingExamsCount}
            />
          </WorkspaceSection>

          <WorkspaceSection
            title="Xodimlar"
            icon={<Users className="h-4 w-4" />}
            density="compact"
          >
            <div className="divide-y divide-xedu-border">
              <StatRow label="O'qituvchilar" value={teacherCount} href="/dashboard/staff" />
              <StatRow label="Boshqa xodimlar" value={staffCount} href="/dashboard/staff" />
              <StatRow label="O'quvchilar" value={studentCount} href="/dashboard/users" />
            </div>
          </WorkspaceSection>
        </div>
      </WorkspaceSidebar>
    </WorkspaceShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function SectionLabel({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon className="h-4 w-4 text-xedu-slate-400" />
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-xedu-slate-500">{title}</h2>
    </div>
  );
}

function ExecCard({
  title,
  href,
  children,
  footer,
  className,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden transition-all duration-200',
        'hover:shadow-sm hover:-translate-y-[1px] hover:border-xedu-slate-200 dark:hover:border-xedu-slate-700',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2.5 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
        <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100 truncate">{title}</h3>
        <ArrowUpRight className="h-3.5 w-3.5 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors shrink-0" />
      </div>
      <div className="px-3 md:px-4 py-3">
        {children}
      </div>
      {footer && (
        <div className="px-3 md:px-4 pb-3">
          {footer}
        </div>
      )}
    </Link>
  );
}

/** Readiness foizini ko'rsatuvchi kichik halqa (0-100). */
function ReadinessRing({ score }: { score: number }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(score, 100));
  const tone =
    clamped >= 80 ? 'text-xedu-emerald-600 dark:text-xedu-emerald-400' :
    clamped >= 60 ? 'text-xedu-amber-600 dark:text-xedu-amber-400' :
    'text-xedu-ruby-600 dark:text-xedu-ruby-400';

  return (
    <div className="relative h-11 w-11 shrink-0" role="img" aria-label={`Tayyorlik darajasi: ${clamped}%`}>
      <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
        <circle
          cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" stroke="currentColor"
          className="text-xedu-slate-100 dark:text-xedu-slate-800"
        />
        <circle
          cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" stroke="currentColor" strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          className={cn('transition-[stroke-dasharray] duration-700 motion-reduce:transition-none', tone)}
        />
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center text-2xs font-black tabular-nums', tone)}>
        {clamped}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    not_started: { label: 'Boshlanmagan', className: 'bg-xedu-slate-100 text-xedu-slate-600 dark:bg-xedu-slate-800 dark:text-xedu-slate-400' },
    in_progress: { label: 'Jarayonda', className: 'bg-xedu-amber-100 text-xedu-amber-700 dark:bg-xedu-amber-900/30 dark:text-xedu-amber-400' },
    ready: { label: 'Tayyor', className: 'bg-xedu-primary-light/60 text-xedu-primary dark:bg-xedu-primary/20 dark:text-xedu-emerald-400' },
    operational: { label: 'Ishlayapti', className: 'bg-xedu-primary-light/60 text-xedu-primary dark:bg-xedu-primary/20 dark:text-xedu-emerald-400' },
  };
  const cfg = map[status] ?? map.not_started;
  return (
    <span className={cn('inline-flex text-2xs font-bold px-2 py-0.5 rounded-full', cfg.className)}>
      {cfg.label}
    </span>
  );
}

const EVENT_TYPE_DOT: Record<string, string> = {
  holiday: 'bg-xedu-emerald-500',
  exam_week: 'bg-xedu-ruby-500',
  school_event: 'bg-xedu-sky-500',
  quarter_start: 'bg-xedu-violet-500',
  quarter_end: 'bg-xedu-violet-500',
  meeting: 'bg-xedu-amber-500',
  other: 'bg-xedu-slate-400',
};

const TODAY_TONE_DOT: Record<string, string> = {
  success: 'bg-xedu-emerald-500',
  attention: 'bg-xedu-amber-500',
  urgent: 'bg-xedu-ruby-500',
  muted: 'bg-xedu-slate-300 dark:bg-xedu-slate-600',
};

function TodayRow({
  tone,
  title,
  detail,
}: {
  tone: 'success' | 'attention' | 'urgent' | 'muted';
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', TODAY_TONE_DOT[tone])} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-xedu-slate-800 dark:text-xedu-slate-200 truncate">{title}</p>
        <p className="text-xs text-xedu-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function MetricCard({
  href,
  icon: Icon,
  label,
  isLoading,
  value,
  valueClassName,
  sub,
  children,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isLoading?: boolean;
  value: string;
  valueClassName?: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-xl border border-xedu-border bg-xedu-bg-panel p-4 transition-all duration-200',
        'hover:shadow-sm hover:-translate-y-[1px] hover:border-xedu-slate-200 dark:hover:border-xedu-slate-700',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-xedu-slate-400 shrink-0" />
          <span className="text-xs text-xedu-slate-500 truncate">{label}</span>
        </div>
        <ArrowUpRight className="h-3 w-3 text-xedu-slate-200 group-hover:text-xedu-primary transition-colors shrink-0" />
      </div>
      {isLoading ? <Skeleton className="h-8 w-16" /> : (
        <>
          <p className={cn('text-2xl font-black tabular-nums text-xedu-slate-900 dark:text-xedu-slate-100', valueClassName)}>
            {value}
          </p>
          {sub && <p className="text-2xs text-xedu-slate-400 mt-0.5 truncate">{sub}</p>}
          {children}
        </>
      )}
    </Link>
  );
}

function StatRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-3 py-2 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30"
    >
      <span className="text-sm text-xedu-slate-700 dark:text-xedu-slate-300">{label}</span>
      <span className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">{value}</span>
    </Link>
  );
}

// ── Recent Operations Summary ─────────────────────────────────────────────────

function RecentOperationsSummary({
  pendingLeaves,
  pendingDiscipline,
  upcomingExams,
}: {
  pendingLeaves: number;
  pendingDiscipline: number;
  upcomingExams: number;
}) {
  const items = [
    { label: "Tasdiqlashni kutmoqda", count: pendingLeaves, href: '/dashboard/approvals' },
    { label: 'Intizom holatlari', count: pendingDiscipline, href: '/dashboard/alerts' },
    { label: 'Yaqin imtihonlar', count: upcomingExams, href: '/dashboard/schedule' },
  ];

  return (
    <div className="divide-y divide-xedu-border">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30"
        >
          <span className="text-sm text-xedu-slate-700 dark:text-xedu-slate-300">{item.label}</span>
          <span className={cn(
            'text-sm font-bold tabular-nums',
            item.count > 0 ? 'text-xedu-slate-900 dark:text-xedu-slate-100' : 'text-xedu-slate-400'
          )}>
            {item.count}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ── KPI Snapshot Card ─────────────────────────────────────────────────────────

const KpiSnapshotCard = memo(function KpiSnapshotCard({ kpiData }: { kpiData: any }) {
  const metrics: any[] = (kpiData as any)?.metrics ?? (kpiData as any)?.items ?? [];
  const overallScore: number | null = (kpiData as any)?.overallScore ?? null;
  const badCount = metrics.filter((m) => m.status === 'bad').length;
  const hasItems = metrics.length > 0;

  return (
    <Link
      href="/dashboard/kpi"
      className="block rounded-xl border border-xedu-border bg-xedu-bg-elevated p-3 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-xedu-slate-500">KPI</p>
        <ArrowUpRight className="h-3 w-3 text-xedu-slate-300" />
      </div>
      {hasItems ? (
        <>
          <p className="text-xl font-black leading-none tracking-tight tabular-nums text-xedu-slate-900 dark:text-xedu-slate-100">
            {overallScore !== null ? `${Math.round(overallScore)}%` : `${metrics.length} ta`}
          </p>
          <p className="text-xs font-medium mt-0.5 text-xedu-slate-500">
            {metrics.length} ta metrika
            {badCount > 0 && (
              <span className="text-xedu-ruby-600 dark:text-xedu-ruby-400"> · {badCount} qizil zonada</span>
            )}
          </p>
        </>
      ) : (
        <>
          <p className="text-xl font-black leading-none tracking-tight text-xedu-slate-400">—</p>
          <p className="text-xs font-medium mt-0.5 text-xedu-slate-500">Ma&apos;lumot yo&apos;q</p>
        </>
      )}
    </Link>
  );
});
