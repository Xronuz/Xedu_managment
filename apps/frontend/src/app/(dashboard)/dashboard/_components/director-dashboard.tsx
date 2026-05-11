'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Users, TrendingUp, TrendingDown,
  CheckCircle2, ShieldAlert, Bell, BarChart2, Activity, Coins,
  ArrowUpRight, GitCompare, X, LayoutDashboard, Sparkles, BarChart3, Zap,
} from 'lucide-react';
import { AiPlaceholderCard } from '@/components/ai/ai-placeholder-card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
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
import { notificationsApi } from '@/lib/api/notifications';

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
  QuickActionSurface,
  ExecutiveSummary,
  ActivityStream,
  BranchComparison,
  SmartInsights,
  ExecutiveBriefing,
  type BranchDetail,
  type SituationBarData,
  type ExecutiveSummaryData,
  type ExecutiveBriefingData,
} from '@/components/director-workspace';

export function DirectorDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeBranchId } = useAuthStore();

  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annTarget, setAnnTarget] = useState('all_staff');

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchDetail | null>(null);

  // ── Comparison mode ────────────────────────────────────────────────────────
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState<string[]>([]);

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: attendanceSummary, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'today-summary', 'school-wide'],
    queryFn: attendanceApi.getTodaySummary,
  });
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'school-wide'],
    queryFn: classesApi.getAll,
  });
  const { data: usersData } = useQuery({
    queryKey: ['users', 'all', 'school-wide'],
    queryFn: () => usersApi.getAll({ limit: 200 }),
  });
  const { data: pendingLeaves } = useQuery({
    queryKey: ['leave-requests', 'pending', 'school-wide'],
    queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }),
  });
  const { data: financeData } = useQuery({
    queryKey: ['finance', 'dashboard', 'school-wide'],
    queryFn: financeApi.getDashboard,
  });
  const { data: pendingDiscipline } = useQuery({
    queryKey: ['discipline', 'unresolved', 'school-wide'],
    queryFn: () => disciplineApi.getAll().catch(() => ({ data: [] })),
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
  });

  // ── Derived data ────────────────────────────────────────────────────────────
  const classList: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const allUsers: any[] = (usersData as any)?.data ?? [];
  const teacherCount = allUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length;
  const studentCount = allUsers.filter((u: any) => u.role === 'student').length;
  const staffCount = allUsers.filter((u: any) =>
    !['student', 'teacher', 'class_teacher', 'parent'].includes(u.role)
  ).length;
  const pendingLeaveList: any[] = (pendingLeaves as any)?.data ?? pendingLeaves ?? [];
  const pendingDisciplineList: any[] = (pendingDiscipline as any)?.data ?? [];
  const presentPct = (attendanceSummary as any)?.presentPct ?? 0;
  const totalStudents = (attendanceSummary as any)?.totalStudents ?? 0;
  const upcomingExamsCount = Array.isArray(upcomingExamsData) ? upcomingExamsData.length : 0;

  const atRisk = (aiSummary?.riskDistribution?.critical ?? 0) + (aiSummary?.riskDistribution?.high ?? 0);

  // ── Executive summary data ──────────────────────────────────────────────────
  const thisMonthRev = financeData?.thisMonthRevenue ?? 0;
  const lastMonthRev = financeData?.lastMonthRevenue ?? 0;
  const revenueGrowth = financeData?.revenueGrowth ?? (lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0);

  const execSummaryData: ExecutiveSummaryData = {
    branchCount: (branches as any[])?.length ?? 0,
    branchTrend: 'stable',
    attendancePct: presentPct > 0 ? presentPct : null,
    attendanceTrend: presentPct > 0 ? (presentPct < 75 ? 'down' : presentPct > 90 ? 'up' : 'stable') : 'stable',
    staffTotal: teacherCount + staffCount,
    staffPressure: pendingLeaveList.length > teacherCount * 0.2 ? 'elevated' : 'normal',
    revenueGrowth: revenueGrowth || null,
    pendingTotal: pendingLeaveList.length + pendingDisciplineList.length,
    pendingTrend: pendingLeaveList.length + pendingDisciplineList.length > 5 ? 'up' : 'stable',
    atRiskCount: atRisk,
    riskTrend: atRisk > 0 ? 'up' : 'stable',
  };

  // ── Executive briefing data ─────────────────────────────────────────────────
  const inactiveBranches = (branches as any[])?.filter((b: any) => !b.isActive) ?? [];
  const briefingData: ExecutiveBriefingData = {
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
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      leaveRequestsApi.review(id, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const broadcastMutation = useMutation({
    mutationFn: notificationsApi.broadcast,
    onSuccess: () => { setAnnTitle(''); setAnnBody(''); },
  });

  const handleBroadcast = () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    broadcastMutation.mutate({ targetGroup: annTarget, title: annTitle, body: annBody });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectBranch = (branch: BranchDetail) => {
    setSelectedBranch(branch);
    setPanelOpen(true);
  };

  const handleOpenCommandPalette = () => {
    document.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  const handleToggleCompare = (id: string) => {
    setCompareSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
  };

  const dayLabel = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  const situationData: SituationBarData = {
    activeBranchName: activeBranchId ? undefined : 'Barcha filiallar',
    totalBranches: (branches as any[])?.length ?? 0,
    alertCount: pendingDisciplineList.length,
    pendingApprovals: pendingLeaveList.length,
    riskSignals: atRisk,
    attendancePct: presentPct > 0 ? presentPct : null,
    systemStatus: 'ok',
  };

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* ── Header + Sticky Situation Zone ─────────────────────────────────── */}
      <div className="w-full lg:col-span-2 space-y-1">
        <QuickActionSurface onOpenCommandPalette={handleOpenCommandPalette} />

        <WorkspaceHeader
          title="Direktor paneli"
          subtitle={`Maktab umumiy holati · ${dayLabel}`}
          icon={<LayoutDashboard className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            <RealtimePulse
              events={['leave-request:created', 'leave-request:updated', 'discipline:created', 'discipline:resolved', 'payment:received', 'class:created', 'class:updated', 'class:removed', 'notification:broadcast']}
              label="Ma'lumot yangilandi"
            />
          }
        />

        <div className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-xedu-bg/90 dark:bg-xedu-slate-950/90 backdrop-blur-sm space-y-1">
          <SituationBar
            data={situationData}
            onAlertsClick={() => router.push('/dashboard/alerts')}
            onApprovalsClick={() => router.push('/dashboard/approvals')}
          />
          <ExecutiveSummary data={execSummaryData} />
        </div>
      </div>

      {/* ── Main Canvas ─────────────────────────────────────────────────────── */}
      <WorkspaceMain>
        <div className="bg-xedu-bg-rail rounded-2xl p-4 md:p-5 space-y-6">
          {/* HERO: Executive Briefing — decision guidance */}
          <ExecutiveBriefing data={briefingData} />

          {/* Primary: Branch Health Map with compare controls */}
        <div className="relative">
          <div className="flex items-center justify-end gap-2 mb-2 px-1">
            {compareMode && compareSelected.length >= 2 && (
              <button
                onClick={() => setCompareSelected([])}
                className="flex items-center gap-1 text-xs font-semibold text-xedu-slate-500 hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
                Tozalash ({compareSelected.length})
              </button>
            )}
            <button
              onClick={() => {
                setCompareMode((v) => !v);
                if (compareMode) setCompareSelected([]);
              }}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                compareMode
                  ? 'bg-xedu-primary text-white'
                  : 'text-xedu-slate-500 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800'
              )}
            >
              <GitCompare className="h-3.5 w-3.5" />
              {compareMode ? 'Taqqoslashni yopish' : 'Filial taqqoslash'}
            </button>
          </div>

          <BranchHealthMap
            branches={(branches as any[]) ?? []}
            allUsers={allUsers}
            pendingLeaves={pendingLeaveList}
            pendingDiscipline={pendingDisciplineList}
            isLoading={branchesLoading}
            selectedBranchId={selectedBranch?.id}
            compareMode={compareMode}
            compareSelected={compareSelected}
            onSelectBranch={handleSelectBranch}
            onToggleCompare={handleToggleCompare}
          />

          {compareSelected.length >= 2 && (
            <div className="mt-4">
              <BranchComparison
                branches={(branches as any[]) ?? []}
                selectedIds={compareSelected}
                allUsers={allUsers}
                pendingLeaves={pendingLeaveList}
                pendingDiscipline={pendingDisciplineList}
                onClose={() => { setCompareMode(false); setCompareSelected([]); }}
                onRemove={(id) => setCompareSelected((prev) => prev.filter((x) => x !== id))}
              />
            </div>
          )}
        </div>

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
            title="E'lon yuborish"
            icon={<Bell className="h-4 w-4" />}
          >
            <div className="space-y-2.5">
              <Select value={annTarget} onValueChange={setAnnTarget}>
                <SelectTrigger className="h-9 text-sm rounded-[14px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_staff">Barcha xodimlar</SelectItem>
                  <SelectItem value="all_teachers">Barcha o'qituvchilar</SelectItem>
                  <SelectItem value="class_teachers">Sinf rahbarlari</SelectItem>
                  <SelectItem value="all_parents">Barcha ota-onalar</SelectItem>
                  <SelectItem value="all_students">Barcha o'quvchilar</SelectItem>
                  <SelectItem value="vice_principal">O'rinbosarlar</SelectItem>
                  <SelectItem value="accountant">Moliya bo'limi</SelectItem>
                  <SelectItem value="librarian">Kutubxonachi</SelectItem>
                </SelectContent>
              </Select>
              <input
                className="w-full rounded-[14px] border px-4 py-2 text-sm outline-none transition-colors focus:ring-2"
                style={{ borderColor: C.border }}
                placeholder="E'lon sarlavhasi..."
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value)}
              />
              <Textarea
                placeholder="E'lon matni..."
                value={annBody}
                onChange={e => setAnnBody(e.target.value)}
                className="resize-none text-sm rounded-[14px]"
                rows={2}
              />
              <Button
                className="w-full h-9"
                onClick={handleBroadcast}
                disabled={!annTitle.trim() || !annBody.trim() || broadcastMutation.isPending}
              >
                {broadcastMutation.isPending ? 'Yuborilmoqda...' : broadcastMutation.isSuccess ? 'Yuborildi' : "E'lon yuborish"}
              </Button>
            </div>
          </WorkspaceSection>
        </div>

        {pendingDisciplineList.length > 0 && (
          <WorkspaceSection
            title="Hal qilinmagan intizom holatlari"
            icon={<ShieldAlert className="h-4 w-4 text-red-500" />}
          >
            <div className="space-y-2 max-h-48 overflow-y-auto">
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
            </div>
          </WorkspaceSection>
        )}

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
        <div className="bg-xedu-bg-rail rounded-2xl p-3 md:p-4">
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
              data={{
                branches: (branches as any[]) ?? [],
                attendanceSummary,
                pendingLeaves: pendingLeaveList,
                pendingDiscipline: pendingDisciplineList,
                aiSummary,
                financeData: financeData as any,
                teacherCount,
                studentCount,
              }}
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

function KPICard({ kpiData }: { kpiData: any }) {
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
}

function AiRiskCard({ aiSummary }: { aiSummary: any }) {
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
}

function EduCoinCard({ coinStats }: { coinStats: any }) {
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
}

// ── Recent Operations — executive snapshot (replaces duplicated Quick Links) ──

function RecentOperations({
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
}
