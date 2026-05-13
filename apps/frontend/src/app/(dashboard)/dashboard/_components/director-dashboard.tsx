'use client';

import { useState, useMemo, useCallback, memo, useTransition, startTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Users, TrendingUp, TrendingDown,
  CheckCircle2, ShieldAlert, BarChart2, Activity, Coins,
  ArrowUpRight, LayoutDashboard, Sparkles, BarChart3, Zap,
} from 'lucide-react';
import { AiPlaceholderCard } from '@/components/ai/ai-placeholder-card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { attendanceApi } from '@/lib/api/attendance';
import { examsApi } from '@/lib/api/exams';
import { coinsApi } from '@/lib/api/coins';
import { kpiApi } from '@/lib/api/kpi';
import { aiAnalyticsApi } from '@/lib/api/ai-analytics';
import { branchesApi } from '@/lib/api/branches';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { financeApi } from '@/lib/api/finance';
import {
  C, ICON_CFG, PCard, QuickActions, AcademicCalendarWidget,
} from './shared-widgets';
import {
  WorkspaceShell,
  WorkspaceHeader,
  WorkspaceMain,
  WorkspaceSidebar,
  WorkspaceSection,
  RealtimePulse,
} from '@/components/workspace-system';
import {
  SituationBar,
  BranchHealthMap,
  FinancialPulse,
  AcademicSnapshot,
  StaffOperations,
  IntelligenceFeed,
  RightContextualPanel,
  ActivityStream,
  SmartInsights,
  ExecutiveBriefing,
  type BranchDetail,
  type SituationBarData,
  type ExecutiveBriefingData,
} from '@/components/director-workspace';

const REALTIME_PULSE_EVENTS = [
  'leave-request:created', 'leave-request:updated', 'discipline:created',
  'discipline:resolved', 'payment:received', 'class:created',
  'class:updated', 'class:removed', 'notification:broadcast',
];

export function DirectorDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeBranchId } = useAuthStore();
  const [, startNonUrgent] = useTransition();

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchDetail | null>(null);

  // ── Comparison mode ────────────────────────────────────────────────────────
  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: attendanceSummary, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'today-summary', 'school-wide'],
    queryFn: attendanceApi.getTodaySummary,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'school-wide'],
    queryFn: classesApi.getAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const { data: usersData } = useQuery({
    queryKey: ['users', 'all', 'school-wide'],
    queryFn: () => usersApi.getAll({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const { data: pendingLeaves } = useQuery({
    queryKey: ['leave-requests', 'pending', 'school-wide'],
    queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const { data: financeData } = useQuery({
    queryKey: ['finance', 'dashboard', 'school-wide'],
    queryFn: financeApi.getDashboard,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const { data: pendingDiscipline } = useQuery({
    queryKey: ['discipline', 'unresolved', 'school-wide'],
    queryFn: () => disciplineApi.getAll().catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const { data: coinStats } = useQuery({
    queryKey: ['coins', 'admin', 'stats'],
    queryFn: () => coinsApi.getStudentBalances().catch(() => ({ data: [] })),
    staleTime: 60_000,
  });
  const { data: kpiData } = useQuery({
    queryKey: ['kpi', 'dashboard', 'dir'],
    queryFn: () => kpiApi.getDashboard().catch(() => ({ items: [] })),
    staleTime: 60_000,
  });
  const { data: aiSummary } = useQuery({
    queryKey: ['ai-analytics', 'dashboard', 'dir'],
    queryFn: () => aiAnalyticsApi.getDashboard().catch(() => null),
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
    gcTime: 10 * 60 * 1000,
  });

  // ── Derived data — all memoised so child memo() comparisons are stable ──────
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

  const atRisk = (aiSummary?.riskDistribution?.critical ?? 0) + (aiSummary?.riskDistribution?.high ?? 0);

  const thisMonthRev = financeData?.thisMonthRevenue ?? 0;
  const lastMonthRev = financeData?.lastMonthRevenue ?? 0;
  const revenueGrowth = financeData?.revenueGrowth ?? (lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0);

  // ── Executive briefing data ─────────────────────────────────────────────────
  const inactiveBranches = useMemo(() =>
    (branches as any[])?.filter((b: any) => !b.isActive) ?? [],
  [branches]);

  const briefingData = useMemo<ExecutiveBriefingData>(() => ({
    pendingLeaves: pendingLeaveList,
    pendingDiscipline: pendingDisciplineList,
    attendancePct: presentPct > 0 ? presentPct : null,
    atRiskCount: atRisk,
    overdueAmount: financeData?.overdueAmount ?? 0,
    inactiveBranches,
    teacherCount,
    studentCount,
    lowGpaCount: aiSummary?.riskDistribution?.low ?? 0,
    upcomingExams: upcomingExamsCount,
  }), [pendingLeaveList, pendingDisciplineList, presentPct, atRisk, financeData?.overdueAmount, inactiveBranches, teacherCount, studentCount, aiSummary?.riskDistribution?.low, upcomingExamsCount]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      leaveRequestsApi.review(id, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectBranch = useCallback((branch: BranchDetail) => {
    startNonUrgent(() => {
      setSelectedBranch(branch);
      setPanelOpen(true);
    });
  }, [startNonUrgent]);



  const handleAlertsClick = useCallback(() => {
    router.push('/dashboard/alerts');
  }, [router]);

  const handleApprovalsClick = useCallback(() => {
    router.push('/dashboard/approvals');
  }, [router]);

  const smartInsightsData = useMemo(() => ({
    branches: (branches as any[]) ?? [],
    attendanceSummary,
    pendingLeaves: pendingLeaveList,
    pendingDiscipline: pendingDisciplineList,
    aiSummary,
    financeData: financeData as any,
    teacherCount,
    studentCount,
  }), [branches, attendanceSummary, pendingLeaveList, pendingDisciplineList, aiSummary, financeData, teacherCount, studentCount]);

  const dayLabel = useMemo(() =>
    new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }),
  []);

  const situationData = useMemo<SituationBarData>(() => ({
    activeBranchName: activeBranchId ? undefined : 'Barcha filiallar',
    totalBranches: (branches as any[])?.length ?? 0,
    alertCount: pendingDisciplineList.length,
    pendingApprovals: pendingLeaveList.length,
    riskSignals: atRisk,
    attendancePct: presentPct > 0 ? presentPct : null,
    staffTotal: teacherCount + staffCount,
    revenueGrowth: revenueGrowth || null,
  }), [activeBranchId, branches, pendingDisciplineList.length, pendingLeaveList.length, atRisk, presentPct, teacherCount, staffCount, revenueGrowth]);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* ── Header + Sticky Situation Zone ─────────────────────────────────── */}
      <div className="w-full lg:col-span-2 space-y-1">
        <WorkspaceHeader
          title="Direktor paneli"
          subtitle={`Maktab umumiy holati · ${dayLabel}`}
          icon={<LayoutDashboard className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            <RealtimePulse
              events={REALTIME_PULSE_EVENTS}
              label="Ma'lumot yangilandi"
            />
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
        <div className="xedu-emerald-mineral rounded-2xl p-4 md:p-5 space-y-6">
          {/* HERO: Executive Briefing — decision guidance */}
          <ExecutiveBriefing data={briefingData} />

          {/* Primary: Branch Health Map — inline comparison */}
          <BranchHealthMap
            branches={(branches as any[]) ?? []}
            allUsers={allUsers}
            pendingLeaves={pendingLeaveList}
            pendingDiscipline={pendingDisciplineList}
            isLoading={branchesLoading}
            selectedBranchId={selectedBranch?.id}
            onSelectBranch={handleSelectBranch}
          />

        {/* Secondary group */}
        <div className="space-y-4">
          <FinancialPulse
            financeData={financeData as any}
            isLoading={!financeData && !attLoading}
          />

          <AcademicSnapshot
            attendanceSummary={attendanceSummary as any}
            classCount={classList.length}
            activeStudents={studentCount}
            upcomingExams={upcomingExamsCount}
            isLoading={attLoading}
          />
        </div>

        {/* Tertiary group */}
        <div className="space-y-3">
          <StaffOperations
            teacherCount={teacherCount}
            staffCount={staffCount}
            pendingLeaves={pendingLeaveList.length}
            pendingDiscipline={pendingDisciplineList.length}
            isLoading={!usersData}
          />

          {/* Supplementary blocks */}
          <div className="grid gap-3 md:grid-cols-2">
          <WorkspaceSection
            title="Ta'til so'rovlari"
            action={
              <Badge variant={pendingLeaveList.length > 0 ? 'destructive' : 'secondary'}>
                {pendingLeaveList.length} ta
              </Badge>
            }
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingLeaveList.length === 0 ? (
                <div className="flex flex-col items-center py-7 gap-2">
                  <CheckCircle2 className="h-6 w-6 text-xedu-primary" />
                  <p className="text-sm font-medium" style={{ color: C.muted }}>Kutilayotgan so'rovlar yo'q</p>
                </div>
              ) : (
                pendingLeaveList.slice(0, 6).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                        {req.requester?.firstName} {req.requester?.lastName}
                      </p>
                      <p className="text-xs truncate" style={{ color: C.muted }}>
                        {new Date(req.startDate).toLocaleDateString('uz-UZ')} – {new Date(req.endDate).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-3">
                      <button
                        className="h-9 px-4 rounded-full text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary focus-visible:ring-offset-1"
                        style={{ background: C.primaryLight, color: C.primary }}
                        onClick={() => reviewMutation.mutate({ id: req.id, action: 'approve' })}
                        disabled={reviewMutation.isPending}
                      >
                        Tasdiqlash
                      </button>
                      <button
                        className="h-9 px-4 rounded-full text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-ruby-500 focus-visible:ring-offset-1"
                        style={{ background: '#FEE2E2', color: '#DC2626' }}
                        onClick={() => reviewMutation.mutate({ id: req.id, action: 'reject' })}
                        disabled={reviewMutation.isPending}
                      >
                        Rad
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Hal qilinmagan intizom holatlari"
            icon={<ShieldAlert className="h-4 w-4 text-red-500" />}
            action={
              pendingDisciplineList.length > 0 ? (
                <Badge variant="destructive">{pendingDisciplineList.length} ta</Badge>
              ) : undefined
            }
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingDisciplineList.length === 0 ? (
                <div className="flex flex-col items-center py-7 gap-2">
                  <CheckCircle2 className="h-6 w-6 text-xedu-primary" />
                  <p className="text-sm font-medium" style={{ color: C.muted }}>Intizom holatlari yo'q</p>
                </div>
              ) : (
                <>
                  {pendingDisciplineList.slice(0, 5).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                      <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                          {d.student?.firstName} {d.student?.lastName}
                        </p>
                        <p className="text-xs truncate" style={{ color: C.muted }}>{d.description}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => router.push('/dashboard/discipline')}
                    className="w-full text-xs font-semibold py-2 rounded-[14px] transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    style={{ color: C.primary }}
                  >
                    Barchasini ko'rish →
                  </button>
                </>
              )}
            </div>
          </WorkspaceSection>
        </div>

          <div className="grid gap-3 md:grid-cols-2">
            <AcademicCalendarWidget canEdit={true} />
            <PCard>
              <p className="font-bold text-base mb-3" style={{ color: C.text }}>So'nggi operatsiyalar</p>
              <RecentOperations
                pendingLeaves={pendingLeaveList.length}
                pendingDiscipline={pendingDisciplineList.length}
                atRisk={atRisk}
                upcomingExams={upcomingExamsCount}
              />
            </PCard>
          </div>
        </div>
        </div>
      </WorkspaceMain>

      {/* ── Right Sidebar ───────────────────────────────────────────────────── */}
      <WorkspaceSidebar width="normal">
        <div className="xedu-intelligence-surface rounded-2xl p-3 md:p-4">
          {/* 1. Operational Intelligence — primary, most urgent */}
          <IntelligenceFeed
            aiSummary={aiSummary}
            pendingLeaves={pendingLeaveList}
            pendingDiscipline={pendingDisciplineList}
            attendanceSummary={attendanceSummary as any}
            branches={(branches as any[]) ?? []}
            upcomingExams={upcomingExamsCount}
            isLoading={!aiSummary && attLoading}
          />

          {/* 2. Analytical layer — insights + activity */}
          <div className="mt-5 space-y-3">
            <SmartInsights
              data={smartInsightsData}
              maxInsights={4}
            />
            <ActivityStream
              pendingLeaves={pendingLeaveList}
              pendingDiscipline={pendingDisciplineList}
              attendanceSummary={attendanceSummary as any}
              branches={(branches as any[]) ?? []}
              aiSummary={aiSummary}
              financeData={financeData as any}
              upcomingExams={upcomingExamsData as any[]}
              maxItems={10}
            />
          </div>

          {/* 3. Quick metrics — compact numbers */}
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-2">
              <KPICard kpiData={kpiData} />
              <AiRiskCard aiSummary={aiSummary} />
              <EduCoinCard coinStats={coinStats} />
            </div>
          </div>

          {/* 4. Passive tools — most separated */}
          <div className="mt-5">
            <WorkspaceSection title="AI xususiyatlar" icon={<Sparkles className="h-4 w-4" />} density="compact">
              <div className="space-y-2">
                <AiPlaceholderCard
                  title="Teacher Pro"
                  description="AI imtihon yaratuvchi, uyga vazifa tekshiruvchi"
                  icon={<Zap className="h-4 w-4" />}
                />
                <AiPlaceholderCard
                  title="AI Insights"
                  description="Bashoratli tahlil va avtomatik tavsiyalar"
                  icon={<BarChart3 className="h-4 w-4" />}
                />
              </div>
            </WorkspaceSection>
          </div>
        </div>
      </WorkspaceSidebar>

      {/* ── Right Contextual Panel ──────────────────────────────────────────── */}
      <RightContextualPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        branch={selectedBranch}
        pendingLeaves={pendingLeaveList}
        pendingDiscipline={pendingDisciplineList}
        attendanceSummary={attendanceSummary as any}
        allUsers={allUsers}
      />
    </WorkspaceShell>
  );
}

// ── Compact side cards ─────────────────────────────────────────────────────────

const KPICard = memo(function KPICard({ kpiData }: { kpiData: any }) {
  const items: any[] = (kpiData as any)?.items ?? [];
  const avg = items.length
    ? Math.round(items.reduce((s: number, i: any) => s + (i.progress ?? 0), 0) / items.length)
    : 0;

  return (
    <Link
      href="/dashboard/kpi"
      className="group block rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg-elevated p-3 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>KPI</p>
        <ArrowUpRight className="h-3 w-3 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
      </div>
      <p className="text-xl font-black leading-none tracking-tight" style={{ color: C.text }}>
        {avg}%
      </p>
      <p className="text-xs font-medium mt-0.5" style={{ color: C.muted }}>
        {items.length} ta metrika
      </p>
    </Link>
  );
});

const AiRiskCard = memo(function AiRiskCard({ aiSummary }: { aiSummary: any }) {
  const atRisk = (aiSummary?.riskDistribution?.critical ?? 0) + (aiSummary?.riskDistribution?.high ?? 0);
  const total = aiSummary?.totalStudents ?? 0;

  return (
    <Link
      href="/dashboard/ai-analytics"
      className="group block rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg-elevated p-3 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>AI Tahlil</p>
        <ArrowUpRight className="h-3 w-3 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
      </div>
      <p
        className="text-xl font-black leading-none tracking-tight"
        style={{ color: atRisk > 0 ? '#DC2626' : C.text }}
      >
        {atRisk}
      </p>
      <p className="text-xs font-medium mt-0.5" style={{ color: C.muted }}>
        {total > 0 ? `xavf ostida / ${total}` : "O'quvchilar tahlili"}
      </p>
    </Link>
  );
});

const EduCoinCard = memo(function EduCoinCard({ coinStats }: { coinStats: any }) {
  const count = (coinStats as any)?.data?.length ?? 0;

  return (
    <Link
      href="/dashboard/coins"
      className="group block rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg-elevated p-3 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary focus-visible:ring-offset-1"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>EduCoin</p>
        <ArrowUpRight className="h-3 w-3 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
      </div>
      <p className="text-xl font-black leading-none tracking-tight" style={{ color: C.text }}>
        {count.toLocaleString()}
      </p>
      <p className="text-xs font-medium mt-0.5" style={{ color: C.muted }}>Faol o'quvchilar</p>
    </Link>
  );
});

// ── Recent Operations — executive snapshot (replaces duplicated Quick Links) ──

const RecentOperations = memo(function RecentOperations({
  pendingLeaves,
  pendingDiscipline,
  atRisk,
  upcomingExams,
}: {
  pendingLeaves: number;
  pendingDiscipline: number;
  atRisk: number;
  upcomingExams: number;
}) {
  const ops = [
    {
      label: "Tasdiqlashni kutmoqda",
      count: pendingLeaves,
      href: '/dashboard/approvals',
      tone: pendingLeaves > 0 ? 'urgent' as const : 'calm' as const,
    },
    {
      label: 'Intizom holatlari',
      count: pendingDiscipline,
      href: '/dashboard/discipline',
      tone: pendingDiscipline > 0 ? 'urgent' as const : 'calm' as const,
    },
    {
      label: "Xavf ostidagi o'quvchilar",
      count: atRisk,
      href: '/dashboard/ai-analytics',
      tone: atRisk > 0 ? 'attention' as const : 'calm' as const,
    },
    {
      label: 'Yaqin imtihonlar',
      count: upcomingExams,
      href: '/dashboard/exams',
      tone: upcomingExams > 0 ? 'attention' as const : 'calm' as const,
    },
  ];

  return (
    <div className="space-y-1">
      {ops.map((op) => (
        <Link
          key={op.label}
          href={op.href}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary focus-visible:ring-offset-1"
        >
          <span className="text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300">{op.label}</span>
          <span className={cn(
            'text-sm font-bold tabular-nums',
            op.tone === 'urgent' ? 'text-xedu-ruby-600' :
            op.tone === 'attention' ? 'text-xedu-amber-600' :
            'text-xedu-slate-400'
          )}>
            {op.count}
          </span>
        </Link>
      ))}
    </div>
  );
});
