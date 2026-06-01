'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ArrowUpRight, Activity, Users, Building2,
  Calendar, GraduationCap, TrendingUp, FileText, Bell,
  CheckCircle2, ChevronRight, Briefcase, BarChart3, Shield,
  Zap, Clock, AlertTriangle, BookOpen, Wallet, School,
  UserCheck, DoorOpen, Layers, Megaphone, Info,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { attendanceApi } from '@/lib/api/attendance';
import { examsApi } from '@/lib/api/exams';
import { kpiApi } from '@/lib/api/kpi';
import { branchesApi } from '@/lib/api/branches';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { financeApi } from '@/lib/api/finance';
import { opsCommandCenterApi } from '@/lib/api/ops-command-center';
import { academicCalendarApi } from '@/lib/api/academic-calendar';

import {
  WorkspaceShell,
  WorkspaceHeader,
  WorkspaceMain,
  WorkspaceSidebar,
  WorkspaceSection,
} from '@/components/workspace-system';
import {
  SituationBar,
  BranchHealthMap,
  type BranchDetail,
  type SituationBarData,
} from '@/components/director-workspace';

/* ═══════════════════════════════════════════════════════════════════════════════
   H1 — DIRECTOR DASHBOARD REFACTOR
   Zone A: 3 executive cards (readiness, approvals, alerts)
   Zone B: delegation feed (hidden for now — real data later)
   Zone C: 4 metrics (students, teachers, attendance, branches)
   ═══════════════════════════════════════════════════════════════════════════════ */

export function DirectorDashboard() {
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  const schoolId = user?.schoolId;

  const [selectedBranch, setSelectedBranch] = useState<BranchDetail | null>(null);

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
    queryFn: () => kpiApi.getDashboard().catch(() => ({ items: [] })),
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
  const upcomingExamsCount = Array.isArray(upcomingExamsData) ? upcomingExamsData.length : 0;

  const dayLabel = useMemo(() =>
    new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }),
  []);

  const readinessScore = readinessData?.score ?? 0;
  const readinessStatus = readinessData?.status ?? 'not_started';

  const situationData = useMemo<SituationBarData>(() => ({
    activeBranchName: activeBranchId ? undefined : 'Barcha filiallar',
    totalBranches: (branches as any[])?.length ?? 0,
    alertCount: (opsAlerts ?? []).length,
    pendingApprovals: todaySummary?.staff?.pendingLeaveRequests ?? 0,
    riskSignals: 0,
    attendancePct: presentPct > 0 ? presentPct : null,
    staffTotal: teacherCount + staffCount,
    revenueGrowth: null,
  }), [activeBranchId, branches, opsAlerts, todaySummary, presentPct, teacherCount, staffCount]);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* ── Header + Sticky Situation Zone ─────────────────────────────────── */}
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
        <div className="sticky top-0 z-20 -mx-2 px-2 py-2 xedu-sticky-executive">
          <SituationBar
            data={situationData}
            onAlertsClick={() => router.push('/dashboard/alerts')}
            onApprovalsClick={() => router.push('/dashboard/approvals')}
          />
        </div>
      </div>

      <WorkspaceMain>
        <div className="space-y-5">

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE A — EXECUTIVE SNAPSHOT (3 cards)
             ═══════════════════════════════════════════════════════════════════ */}
          <SectionLabel title="Umumiy ko'rinish" icon={BarChart3} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. School Health */}
            <ExecCard
              title="Maktab salomatligi"
              href="/dashboard/ops"
              owner="director"
              isLoading={readinessLoading}
              footer={!readinessLoading && readinessScore < 80 ? (
                <span className="text-xs font-medium text-xedu-primary cursor-pointer hover:underline">
                  Sozlashni davom ettirish →
                </span>
              ) : null}
            >
              {readinessLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'text-2xl font-black',
                      readinessScore >= 80 ? 'text-emerald-600' :
                      readinessScore >= 60 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {readinessScore}%
                    </span>
                    <StatusBadge status={readinessStatus} />
                  </div>
                  <p className="text-xs text-xedu-slate-500">
                    {readinessScore >= 80 ? 'Maktab yaxshi holatda' :
                     readinessScore >= 60 ? 'E\'tibor talab etadi' : 'Jiddiy muammo bor'}
                  </p>
                </div>
              )}
            </ExecCard>

            {/* 2. Approvals */}
            <ExecCard
              title="Tasdiqlashlar"
              href="/dashboard/approvals"
              owner="director"
              isLoading={todayLoading}
            >
              {todayLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="space-y-2">
                  {(todaySummary?.staff?.pendingLeaveRequests ?? 0) > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">
                        {todaySummary?.staff?.pendingLeaveRequests ?? 0}
                      </span>
                      <span className={cn('text-2xs font-bold px-2 py-0.5 rounded-full bg-xedu-amber-100 text-xedu-amber-700 dark:bg-xedu-amber-900/30 dark:text-xedu-amber-400')}>
                        Kutilmoqda
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Hamma tasdiqlangan</p>
                  )}
                  <p className="text-xs text-xedu-slate-500">Ko'rish →</p>
                </div>
              )}
            </ExecCard>

            {/* 3. Alerts */}
            <ExecCard
              title="Ogohlantirishlar"
              href="/dashboard/alerts"
              owner="director"
              isLoading={alertsLoading}
            >
              {alertsLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">
                      {(opsAlerts ?? []).length}
                    </span>
                    {(opsAlerts ?? []).length > 0 && (
                      <Badge variant="destructive" className="text-[10px]">Yangi</Badge>
                    )}
                  </div>
                  <p className="text-xs text-xedu-slate-500">
                    {(opsAlerts ?? []).length === 0 ? 'Hamma yaxshi' : 'Ko\'rib chiqish kerak'}
                  </p>
                </div>
              )}
            </ExecCard>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE B — UPCOMING EVENTS + ACTIVITY FEED
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Qism 1 — Academic Calendar (60%) */}
            <div className="lg:col-span-3 rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
                <Calendar className="h-4 w-4 text-xedu-slate-500" />
                <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">Yaqin tadbirlar</h3>
              </div>
              <div className="px-4 py-3">
                {eventsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {((academicEvents as any[])?.length ?? 0) > 0 ? (
                      (academicEvents as any[]).slice(0, 5).map((evt: any) => (
                        <div key={evt.id} className="flex items-center gap-3 py-1.5">
                          <div className={cn('h-2 w-2 rounded-full shrink-0', EVENT_TYPE_DOT[evt.type] ?? EVENT_TYPE_DOT.other)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-xedu-slate-800 dark:text-xedu-slate-200 truncate">{evt.title}</p>
                          </div>
                          <span className="text-xs text-xedu-slate-500 shrink-0">
                            {formatEventDate(evt.startDate)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-xedu-slate-500 py-2">30 kunlik tadbirlar yo&apos;q</p>
                    )}
                  </div>
                )}
              </div>
              <div className="px-4 pb-3">
                <Link href="/dashboard/academic-calendar" className="text-xs font-medium text-xedu-primary hover:underline">
                  Barchasi →
                </Link>
              </div>
            </div>

            {/* Qism 2 — Activity Feed (40%) */}
            <div className="lg:col-span-2 rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
                <Clock className="h-4 w-4 text-xedu-slate-500" />
                <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">Faoliyat</h3>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-xedu-slate-800 dark:text-xedu-slate-200">Jadval nashr qilindi</p>
                    <p className="text-xs text-xedu-slate-500">Bugun</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-xedu-slate-800 dark:text-xedu-slate-200">5 ta ogohlantirish</p>
                    <p className="text-xs text-xedu-slate-500">Yangi</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-xedu-slate-800 dark:text-xedu-slate-200">Ish haqi loyihasi</p>
                    <p className="text-xs text-xedu-slate-500">Kutilmoqda</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE C — 4 METRICS
             ═══════════════════════════════════════════════════════════════════ */}
          <SectionLabel title="Asosiy ko'rsatkichlar" icon={BarChart3} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/dashboard/users" className="group block rounded-xl border border-xedu-border bg-xedu-bg-panel p-4 transition-all hover:shadow-sm hover:border-xedu-slate-200 dark:hover:border-xedu-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-xedu-slate-400" />
                <span className="text-xs text-xedu-slate-500">O'quvchilar</span>
              </div>
              {!usersData ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">{studentCount}</p>
              )}
            </Link>
            <Link href="/dashboard/staff" className="group block rounded-xl border border-xedu-border bg-xedu-bg-panel p-4 transition-all hover:shadow-sm hover:border-xedu-slate-200 dark:hover:border-xedu-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-xedu-slate-400" />
                <span className="text-xs text-xedu-slate-500">O'qituvchilar</span>
              </div>
              {!usersData ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">{teacherCount}</p>
              )}
            </Link>
            <Link href="/dashboard/attendance" className="group block rounded-xl border border-xedu-border bg-xedu-bg-panel p-4 transition-all hover:shadow-sm hover:border-xedu-slate-200 dark:hover:border-xedu-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-xedu-slate-400" />
                <span className="text-xs text-xedu-slate-500">Davomat</span>
              </div>
              {attLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className={cn('text-2xl font-black', presentPct > 0 && presentPct < 80 ? 'text-amber-600' : 'text-xedu-slate-900 dark:text-xedu-slate-100')}>
                  {presentPct > 0 ? `${presentPct}%` : '—'}
                </p>
              )}
            </Link>
            <Link href="/dashboard/branches" className="group block rounded-xl border border-xedu-border bg-xedu-bg-panel p-4 transition-all hover:shadow-sm hover:border-xedu-slate-200 dark:hover:border-xedu-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-xedu-slate-400" />
                <span className="text-xs text-xedu-slate-500">Filiallar</span>
              </div>
              {branchesLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">{(branches as any[])?.length ?? 0}</p>
              )}
            </Link>
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
  owner,
  isLoading,
  children,
  footer,
}: {
  title: string;
  href: string;
  owner: 'director' | 'vice_principal' | 'branch_admin' | 'accountant';
  isLoading?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden transition-all hover:shadow-sm hover:border-xedu-slate-200 dark:hover:border-xedu-slate-700"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{title}</h3>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
      {footer && (
        <div className="px-4 pb-2">
          {footer}
        </div>
      )}
      <div className="px-4 pb-3">
        <OwnerBadge owner={owner} />
      </div>
    </Link>
  );
}

function OwnerBadge({ owner, size = 'sm' }: { owner: 'director' | 'vice_principal' | 'branch_admin' | 'accountant'; size?: 'sm' | 'xs' }) {
  const config = {
    director: { label: 'Sizning vazifangiz', className: 'bg-xedu-primary-light/60 text-xedu-primary dark:bg-xedu-primary/20 dark:text-xedu-emerald-400' },
    vice_principal: { label: "VP bajaradi", className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    branch_admin: { label: 'Filial admin bajaradi', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    accountant: { label: "Moliya bo'limi", className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  };
  const cfg = config[owner];
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-2xs px-2 py-0.5',
      cfg.className
    )}>
      {cfg.label}
    </span>
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
    <span className={cn('text-2xs font-bold px-2 py-0.5 rounded-full', cfg.className)}>
      {cfg.label}
    </span>
  );
}

const EVENT_TYPE_DOT: Record<string, string> = {
  holiday: 'bg-emerald-500',
  exam_week: 'bg-red-500',
  school_event: 'bg-blue-500',
  quarter_start: 'bg-violet-500',
  quarter_end: 'bg-violet-500',
  meeting: 'bg-amber-500',
  other: 'bg-slate-400',
};

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
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

// ── Quick Actions Grid ────────────────────────────────────────────────────────

function QuickActionsGrid() {
  const router = useRouter();

  const actions = [
    { label: 'Tasdiqlash inbox', href: '/dashboard/approvals', icon: FileText, color: '#DC2626', owner: 'director' as const },
    { label: 'Filiallar', href: '/dashboard/branches', icon: Building2, color: '#2563EB', owner: 'director' as const },
    { label: 'Xodimlar', href: '/dashboard/staff', icon: Briefcase, color: '#7C3AED', owner: 'director' as const },
    { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users, color: '#0891B2', owner: 'director' as const },
    { label: 'Ish haqi', href: '/dashboard/payroll', icon: TrendingUp, color: '#0F7B53', owner: 'accountant' as const },
    { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart3, color: '#D97706', owner: 'director' as const },
    { label: 'Operatsion markaz', href: '/dashboard/ops', icon: Zap, color: '#4338CA', owner: 'director' as const },
    { label: 'Sozlamalar', href: '/dashboard/settings', icon: Shield, color: '#64748B', owner: 'director' as const },
  ];

  return (
    <div className="rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
        <Zap className="h-4 w-4 text-xedu-slate-500" />
        <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">Tezkor harakatlar</h3>
      </div>
      <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map(({ label, href, icon: Icon, color, owner }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
              'hover:-translate-y-[1px] hover:shadow-sm hover:border-xedu-slate-200',
              'border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg-elevated'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <OwnerBadge owner={owner} size="xs" />
            </div>
            <span className="text-sm font-semibold text-xedu-slate-800 dark:text-xedu-slate-200">{label}</span>
          </button>
        ))}
      </div>
    </div>
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
  const items: any[] = (kpiData as any)?.items ?? (kpiData as any)?.metrics ?? [];
  const hasItems = items.length > 0;

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
          <p className="text-xl font-black leading-none tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
            {items.length} ta
          </p>
          <p className="text-xs font-medium mt-0.5 text-xedu-slate-500">Aktiv metrika</p>
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
