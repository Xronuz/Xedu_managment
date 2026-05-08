'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Users, TrendingUp, TrendingDown,
  CheckCircle2, ShieldAlert, Bell, BarChart2, Activity, Coins,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
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
import { academicCalendarApi } from '@/lib/api/academic-calendar';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { financeApi } from '@/lib/api/finance';
import { notificationsApi } from '@/lib/api/notifications';

import {
  C, ICON_CFG, PCard, QuickActions, AcademicCalendarWidget,
} from './shared-widgets';

import {
  SituationBar,
  BranchHealthMap,
  FinancialPulse,
  AcademicSnapshot,
  StaffOperations,
  IntelligenceFeed,
  RightContextualPanel,
  QuickActionSurface,
  type BranchDetail,
  type SituationBarData,
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

  // ── Data queries ─────────────────────────────────────────────────────────────
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

  // ── Derived data ─────────────────────────────────────────────────────────────
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

  // ── Mutations ────────────────────────────────────────────────────────────────
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
    <div className="relative pb-20 md:pb-6 space-y-5">
      {/* Quick Action Surface */}
      <QuickActionSurface onOpenCommandPalette={handleOpenCommandPalette} />

      {/* Header */}
      <div>
        <h1 className="text-[28px] font-black tracking-tight leading-none" style={{ color: C.text }}>
          Direktor paneli
        </h1>
        <p className="text-sm mt-1.5 font-medium" style={{ color: C.muted }}>
          Maktab umumiy holati · {dayLabel}
        </p>
      </div>

      {/* Sticky Situation Bar */}
      <div className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-xedu-bg/90 dark:bg-xedu-slate-950/90 backdrop-blur-sm">
        <SituationBar
          data={situationData}
          onAlertsClick={() => router.push('/dashboard/alerts')}
          onApprovalsClick={() => router.push('/dashboard/approvals')}
        />
      </div>

      {/* ── Strategic Overview Canvas ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Main canvas */}
        <div className="flex-1 min-w-0 space-y-4">
          <BranchHealthMap
            branches={(branches as any[]) ?? []}
            allUsers={allUsers}
            pendingLeaves={pendingLeaveList}
            pendingDiscipline={pendingDisciplineList}
            isLoading={branchesLoading}
            selectedBranchId={selectedBranch?.id}
            onSelectBranch={handleSelectBranch}
          />

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

          <StaffOperations
            teacherCount={teacherCount}
            staffCount={staffCount}
            pendingLeaves={pendingLeaveList.length}
            pendingDiscipline={pendingDisciplineList.length}
            isLoading={!usersData}
          />
        </div>

        {/* Intelligence Feed */}
        <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 space-y-4">
          <IntelligenceFeed
            aiSummary={aiSummary}
            pendingLeaves={pendingLeaveList}
            pendingDiscipline={pendingDisciplineList}
            attendanceSummary={attendanceSummary as any}
            branches={(branches as any[]) ?? []}
            upcomingExams={upcomingExamsCount}
            isLoading={!aiSummary && attLoading}
          />

          {/* Legacy: KPI + AI quick cards (preserved) */}
          <div className="space-y-2.5">
            <KPICard kpiData={kpiData} />
            <AiRiskCard aiSummary={aiSummary} />
            <EduCoinCard coinStats={coinStats} />
          </div>
        </div>
      </div>

      {/* ── Supplementary blocks (preserved interactive widgets) ──────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Leave approval quick-list */}
        <PCard>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>Ta'til so'rovlari</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{pendingLeaveList.length} ta kutilmoqda</p>
            </div>
            <Badge variant={pendingLeaveList.length > 0 ? 'destructive' : 'secondary'}>
              {pendingLeaveList.length} ta
            </Badge>
          </div>
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
                      className="h-7 px-3 rounded-full text-xs font-semibold"
                      style={{ background: C.primaryLight, color: C.primary }}
                      onClick={() => reviewMutation.mutate({ id: req.id, action: 'approve' })}
                      disabled={reviewMutation.isPending}
                    >
                      Tasdiqlash
                    </button>
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold"
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
        </PCard>

        {/* Broadcast */}
        <PCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: ICON_CFG.blue.bg }}>
              <Bell className="h-4 w-4" style={{ color: ICON_CFG.blue.icon }} />
            </div>
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>E'lon yuborish</p>
              <p className="text-xs" style={{ color: C.muted }}>Toplu xabar yuborish</p>
            </div>
          </div>
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
        </PCard>
      </div>

      {/* Pending discipline */}
      {pendingDisciplineList.length > 0 && (
        <PCard>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <p className="font-bold text-[15px]" style={{ color: C.text }}>Hal qilinmagan intizom holatlari</p>
          </div>
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
        </PCard>
      )}

      {/* Academic calendar + quick links */}
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicCalendarWidget canEdit={true} />
        <PCard>
          <p className="font-bold text-[15px] mb-3" style={{ color: C.text }}>Tezkor havolalar</p>
          <QuickActions items={[
            { label: 'Davomat hisoboti', href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
            { label: 'Baholar', href: '/dashboard/grades', icon: BarChart2, iconColor: '#2563EB' },
            { label: 'Moliya xulosasi', href: '/dashboard/finance', icon: TrendingUp, iconColor: '#D97706' },
            { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Activity, iconColor: '#7C3AED' },
            { label: 'Xodimlar', href: '/dashboard/staff', icon: Users, iconColor: C.muted },
            { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart2, iconColor: '#4338CA' },
          ]} />
        </PCard>
      </div>

      {/* Right Contextual Panel */}
      <RightContextualPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        branch={selectedBranch}
        pendingLeaves={pendingLeaveList}
        pendingDiscipline={pendingDisciplineList}
        attendanceSummary={attendanceSummary as any}
        allUsers={allUsers}
      />
    </div>
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
      className="group block rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-3 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>KPI</p>
        <ArrowUpRight className="h-3 w-3 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
      </div>
      <p className="text-xl font-black leading-none tracking-tight" style={{ color: C.text }}>
        {avg}%
      </p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color: C.muted }}>
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
      className="group block rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-3 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>AI Tahlil</p>
        <ArrowUpRight className="h-3 w-3 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
      </div>
      <p
        className="text-xl font-black leading-none tracking-tight"
        style={{ color: atRisk > 0 ? '#DC2626' : C.text }}
      >
        {atRisk}
      </p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color: C.muted }}>
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
      className="group block rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-3 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>EduCoin</p>
        <ArrowUpRight className="h-3 w-3 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
      </div>
      <p className="text-xl font-black leading-none tracking-tight" style={{ color: C.text }}>
        {count.toLocaleString()}
      </p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color: C.muted }}>Faol o'quvchilar</p>
    </Link>
  );
}
