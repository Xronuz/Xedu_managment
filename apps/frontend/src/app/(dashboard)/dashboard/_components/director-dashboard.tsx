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
   PHASE 3 — EXECUTIVE DASHBOARD REDESIGN
   Goal: Transform stable landing page into executive command dashboard.
   Principles:
   - Delegation-first: every block shows WHO owns WHAT
   - No fake AI data
   - Reuse existing APIs only
   - Cards, summaries, CTA navigation — no dense tables or inline editors
   ═══════════════════════════════════════════════════════════════════════════════ */

export function DirectorDashboard() {
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  const schoolId = user?.schoolId;

  const [selectedBranch, setSelectedBranch] = useState<BranchDetail | null>(null);

  // ── Ops Command Center APIs (new for Phase 3) ───────────────────────────────
  const { data: readinessData, isLoading: readinessLoading } = useQuery({
    queryKey: ['ops', 'readiness', schoolId],
    queryFn: () => (schoolId ? opsCommandCenterApi.getReadiness(schoolId) : Promise.resolve(null)),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId,
  });
  const { data: roleReadiness, isLoading: roleReadinessLoading } = useQuery({
    queryKey: ['ops', 'readiness', 'role', schoolId],
    queryFn: () => (schoolId ? opsCommandCenterApi.getRoleReadiness(schoolId) : Promise.resolve(null)),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId,
  });
  const { data: opsAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['ops', 'alerts', activeBranchId],
    queryFn: () => opsCommandCenterApi.getAlerts(activeBranchId ?? undefined),
    staleTime: 60_000,
  });
  const { data: todaySummary, isLoading: todayLoading } = useQuery({
    queryKey: ['ops', 'today-summary', activeBranchId],
    queryFn: () => opsCommandCenterApi.getTodaySummary(activeBranchId ?? undefined),
    staleTime: 60_000,
  });

  // ── Existing APIs (Phase 2) ─────────────────────────────────────────────────
  const { data: attendanceSummary, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'today-summary', 'school-wide'],
    queryFn: attendanceApi.getTodaySummary,
    staleTime: 5 * 60 * 1000,
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'school-wide'],
    queryFn: classesApi.getAll,
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
  const { data: financeData } = useQuery({
    queryKey: ['finance', 'dashboard', 'school-wide'],
    queryFn: financeApi.getDashboard,
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

  // ── Derived data ────────────────────────────────────────────────────────────
  const classList: any[] = useMemo(
    () => Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [],
    [classesData],
  );
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

  // Readiness derived
  const readinessScore = readinessData?.score ?? 0;
  const readinessStatus = readinessData?.status ?? 'not_started';
  const directorOwned = useMemo(() =>
    readinessData?.checklist?.filter((i) => i.primaryOwner === 'director' && !i.completed) ?? [],
  [readinessData]);
  const delegatedBlockers = useMemo(() =>
    readinessData?.checklist?.filter((i) => i.primaryOwner !== 'director' && i.required && !i.completed) ?? [],
  [readinessData]);

  // Alerts derived
  const criticalAlerts = useMemo(() =>
    (opsAlerts ?? []).filter((a) => a.severity === 'critical' && a.resolutionState !== 'resolved').slice(0, 5),
  [opsAlerts]);

  // Role readiness derived
  const vpDelegated = roleReadiness?.delegatedActions?.filter((a) => a.primaryOwner === 'vice_principal') ?? [];
  const baDelegated = roleReadiness?.delegatedActions?.filter((a) => a.primaryOwner === 'branch_admin') ?? [];
  const accDelegated = roleReadiness?.delegatedActions?.filter((a) => a.primaryOwner === 'accountant') ?? [];

  const situationData = useMemo<SituationBarData>(() => ({
    activeBranchName: activeBranchId ? undefined : 'Barcha filiallar',
    totalBranches: (branches as any[])?.length ?? 0,
    alertCount: criticalAlerts.length,
    pendingApprovals: pendingLeaveList.length,
    riskSignals: 0,
    attendancePct: presentPct > 0 ? presentPct : null,
    staffTotal: teacherCount + staffCount,
    revenueGrowth: financeData?.revenueGrowth ?? null,
  }), [activeBranchId, branches, criticalAlerts.length, pendingLeaveList.length, presentPct, teacherCount, staffCount, financeData?.revenueGrowth]);

  const handleSelectBranch = useCallback((branch: BranchDetail) => {
    setSelectedBranch(branch);
  }, []);

  const handleAlertsClick = useCallback(() => {
    router.push('/dashboard/alerts');
  }, [router]);

  const handleApprovalsClick = useCallback(() => {
    router.push('/dashboard/approvals');
  }, [router]);

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
            onAlertsClick={handleAlertsClick}
            onApprovalsClick={handleApprovalsClick}
          />
        </div>
      </div>

      {/* ── Main Canvas ─────────────────────────────────────────────────────── */}
      <WorkspaceMain>
        <div className="space-y-5">

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE A — EXECUTIVE SNAPSHOT
             ═══════════════════════════════════════════════════════════════════ */}
          <SectionLabel title="Umumiy ko'rinish" icon={BarChart3} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* 1. School Readiness */}
            <ExecCard
              title="Maktab tayyorgarligi"
              href="/dashboard/ops"
              owner="director"
              isLoading={readinessLoading}
            >
              {readinessLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">
                      {readinessScore}%
                    </span>
                    <StatusBadge status={readinessStatus} />
                  </div>
                  {directorOwned.length > 0 && (
                    <p className="text-xs font-medium text-xedu-ruby-600">
                      {directorOwned.length} ta sizning vazifangiz
                    </p>
                  )}
                  {delegatedBlockers.length > 0 && (
                    <p className="text-xs text-xedu-slate-500">
                      {delegatedBlockers.length} ta topshirilgan ish bloklangan
                    </p>
                  )}
                  {directorOwned.length === 0 && delegatedBlockers.length === 0 && (
                    <p className="text-xs text-xedu-slate-500">Barcha ko'rsatkichlar normal</p>
                  )}
                </div>
              )}
            </ExecCard>

            {/* 2. Approvals Queue */}
            <ExecCard
              title="Tasdiqlash navbati"
              href="/dashboard/approvals"
              owner="director"
              isLoading={!pendingLeaves}
            >
              {!pendingLeaves ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">
                      {pendingLeaveList.length}
                    </span>
                    {pendingLeaveList.length > 0 && (
                      <Badge variant="destructive" className="text-[10px]">Kutilmoqda</Badge>
                    )}
                  </div>
                  <p className="text-xs text-xedu-slate-500">
                    {pendingDisciplineList.length > 0
                      ? `${pendingDisciplineList.length} ta intizom holati ham kutilmoqda`
                      : 'Intizom holatlari yo\'q'}
                  </p>
                </div>
              )}
            </ExecCard>

            {/* 3. Finance Pulse */}
            <ExecCard
              title="Moliya holati"
              href="/dashboard/finance"
              owner="accountant"
              isLoading={!financeData}
            >
              {!financeData ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">
                      {financeData?.thisMonthRevenue
                        ? `${(financeData.thisMonthRevenue / 1_000_000).toFixed(1)}M`
                        : '—'}
                    </span>
                    {financeData?.overdueAmount ? (
                      <Badge variant="destructive" className="text-[10px]">Qarzdorlik</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Normal</Badge>
                    )}
                  </div>
                  <p className="text-xs text-xedu-slate-500">
                    {financeData?.latestPayroll
                      ? `Ish haqi: ${financeData.latestPayroll.status}`
                      : 'Ma\'lumot yetarli emas'}
                  </p>
                </div>
              )}
            </ExecCard>

            {/* 4. Academic Pulse */}
            <ExecCard
              title="Ta'lim holati"
              href="/dashboard/reports"
              owner="vice_principal"
              isLoading={todayLoading || attLoading}
            >
              {todayLoading || attLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-xedu-slate-900 dark:text-xedu-slate-100">
                      {presentPct > 0 ? `${presentPct}%` : '—'}
                    </span>
                    {todaySummary?.schedule?.conflicts ? (
                      <Badge variant="destructive" className="text-[10px]">{todaySummary.schedule.conflicts} ta ziddiyat</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Davomat</Badge>
                    )}
                  </div>
                  <p className="text-xs text-xedu-slate-500">
                    {todaySummary?.schedule?.publishedSlots
                      ? `${todaySummary.schedule.publishedSlots} ta dars nashr etilgan`
                      : 'Jadval ma\'lumoti yo\'q'}
                  </p>
                </div>
              )}
            </ExecCard>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE B — DELEGATED OPERATIONS
             ═══════════════════════════════════════════════════════════════════ */}
          <SectionLabel title="Topshirilgan operatsiyalar" icon={UserCheck} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DelegationCard
              title="O'rinbosar (VP)"
              ownerLabel="VP bajaradi"
              count={vpDelegated.length}
              items={vpDelegated.slice(0, 4)}
              href="/dashboard/ops"
              color="blue"
              isLoading={roleReadinessLoading}
            />
            <DelegationCard
              title="Filial admin"
              ownerLabel="Filial admin bajaradi"
              count={baDelegated.length}
              items={baDelegated.slice(0, 4)}
              href="/dashboard/ops"
              color="amber"
              isLoading={roleReadinessLoading}
            />
            <DelegationCard
              title="Moliya bo'limi"
              ownerLabel="Moliya bo'limi bajaradi"
              count={accDelegated.length}
              items={accDelegated.slice(0, 4)}
              href="/dashboard/ops"
              color="emerald"
              isLoading={roleReadinessLoading}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
             ZONE C — STRATEGIC VISIBILITY
             ═══════════════════════════════════════════════════════════════════ */}
          <SectionLabel title="Strategik nazorat" icon={Shield} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Branch Health */}
            <div className="lg:col-span-2">
              <BranchHealthMap
                branches={(branches as any[]) ?? []}
                allUsers={allUsers}
                pendingLeaves={pendingLeaveList}
                pendingDiscipline={pendingDisciplineList}
                isLoading={branchesLoading}
                selectedBranchId={selectedBranch?.id}
                onSelectBranch={handleSelectBranch}
              />
            </div>

            {/* Right column: Alerts + Ops Summary */}
            <div className="space-y-3">
              {/* Critical Alerts */}
              <WorkspaceSection
                title="Muhim ogohlantirishlar"
                icon={<AlertTriangle className="h-4 w-4 text-xedu-ruby-500" />}
                density="compact"
                action={
                  criticalAlerts.length > 0 ? (
                    <Badge variant="destructive" className="text-[10px]">{criticalAlerts.length}</Badge>
                  ) : undefined
                }
              >
                {alertsLoading ? (
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : criticalAlerts.length === 0 ? (
                  <EmptyState message="Muhim ogohlantirishlar yo'q" />
                ) : (
                  <div className="divide-y divide-xedu-border">
                    {criticalAlerts.map((alert) => (
                      <Link
                        key={alert.id}
                        href={alert.route || '/dashboard/alerts'}
                        className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30 transition-colors"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-xedu-ruby-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-xedu-slate-800 dark:text-xedu-slate-200 truncate">
                            {alert.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <OwnerBadge owner={alert.owner} size="xs" />
                            <span className="text-2xs text-xedu-slate-400 truncate">{alert.actionCta}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </WorkspaceSection>

              {/* Ops Summary */}
              <WorkspaceSection
                title="Bugun"
                icon={<Clock className="h-4 w-4" />}
                density="compact"
              >
                {todayLoading ? (
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : !todaySummary ? (
                  <EmptyState message="Ma'lumot yetarli emas" />
                ) : (
                  <div className="divide-y divide-xedu-border">
                    <TodayRow label="Darslar" value={todaySummary.stats.totalClassesToday} href="/dashboard/schedule" />
                    <TodayRow label="O'qituvchilar" value={todaySummary.stats.totalTeachersToday} href="/dashboard/staff" />
                    <TodayRow label="O'rinbosarlar" value={todaySummary.substitutions.activeToday} href="/dashboard/teacher-substitutions" />
                    <TodayRow label="Tasdiqlash kutmoqda" value={todaySummary.staff.pendingLeaveRequests} href="/dashboard/approvals" tone={todaySummary.staff.pendingLeaveRequests > 0 ? 'attention' : 'calm'} />
                  </div>
                )}
              </WorkspaceSection>
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActionsGrid />

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
}: {
  title: string;
  href: string;
  owner: 'director' | 'vice_principal' | 'branch_admin' | 'accountant';
  isLoading?: boolean;
  children: React.ReactNode;
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
      <div className="px-4 pb-3">
        <OwnerBadge owner={owner} />
      </div>
    </Link>
  );
}

function DelegationCard({
  title,
  ownerLabel,
  count,
  items,
  href,
  color,
  isLoading,
}: {
  title: string;
  ownerLabel: string;
  count: number;
  items: any[];
  href: string;
  color: 'blue' | 'amber' | 'emerald';
  isLoading?: boolean;
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  };
  const c = colorMap[color];

  return (
    <div className={cn('rounded-xl border overflow-hidden bg-xedu-bg-panel', c.border)}>
      <div className={cn('flex items-center justify-between px-4 py-2.5 border-b', c.bg, c.border)}>
        <div className="flex items-center gap-2">
          <h3 className={cn('text-sm font-bold', c.text)}>{title}</h3>
        </div>
        {count > 0 ? (
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', c.badge)}>{count} ta</span>
        ) : (
          <CheckCircle2 className="h-4 w-4 text-xedu-slate-300" />
        )}
      </div>
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : count === 0 ? (
          <EmptyState message="Barcha vazifalar bajarilgan" compact />
        ) : (
          <div className="space-y-1.5">
            {items.map((item, idx) => (
              <div key={item.id ?? idx} className="flex items-center gap-2">
                <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', c.text.replace('text-', 'bg-'))} />
                <span className="text-sm text-xedu-slate-700 dark:text-xedu-slate-300 truncate">{item.label}</span>
              </div>
            ))}
            {count > 4 && (
              <p className="text-xs text-xedu-slate-400 pl-3.5">+{count - 4} ta boshqa</p>
            )}
          </div>
        )}
      </div>
      <div className="px-4 pb-3">
        <OwnerBadge owner={
          title.includes('VP') ? 'vice_principal' :
          title.includes('Moliya') ? 'accountant' :
          'branch_admin'
        } />
      </div>
    </div>
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

function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-1.5', compact ? 'py-4' : 'py-6')}>
      <CheckCircle2 className="h-5 w-5 text-xedu-slate-300" />
      <p className="text-xs text-xedu-slate-500 text-center">{message}</p>
    </div>
  );
}

function TodayRow({
  label,
  value,
  href,
  tone = 'calm',
}: {
  label: string;
  value: number;
  href: string;
  tone?: 'calm' | 'attention' | 'urgent';
}) {
  const valueColor = tone === 'urgent' ? 'text-xedu-ruby-600' : tone === 'attention' ? 'text-xedu-amber-600' : 'text-xedu-slate-900 dark:text-xedu-slate-100';
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-3 py-2 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30"
    >
      <span className="text-sm text-xedu-slate-700 dark:text-xedu-slate-300">{label}</span>
      <span className={cn('text-sm font-bold tabular-nums', valueColor)}>{value}</span>
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
