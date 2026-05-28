'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ArrowUpRight, Activity, Users, Building2,
  Calendar, GraduationCap, TrendingUp, FileText, Bell,
  CheckCircle2, ChevronRight, Briefcase, BarChart3, Shield,
  Zap, Clock,
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
  FinancialPulse,
  AcademicSnapshot,
  StaffOperations,
  type BranchDetail,
  type SituationBarData,
} from '@/components/director-workspace';

/* ── Phase 2: Restored Director Executive Dashboard ───────────────────────────
   Goal: stable, useful landing page after removing forced /dashboard/ops redirect.
   Principles:
   - No fake AI data. APIs that return synthetic data are treated as optional.
   - All quick-action links point to curated Director routes (Phase 1 sidebar).
   - Clear CTA to Ops Center for full operational view.
   - Safe empty/loading states on every section.
   ──────────────────────────────────────────────────────────────────────────── */

export function DirectorDashboard() {
  const router = useRouter();
  const { activeBranchId } = useAuthStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchDetail | null>(null);

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
    gcTime: 10 * 60 * 1000,
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

  const inactiveBranches = useMemo(() =>
    (branches as any[])?.filter((b: any) => !b.isActive) ?? [],
  [branches]);

  const dayLabel = useMemo(() =>
    new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }),
  []);

  const situationData = useMemo<SituationBarData>(() => ({
    activeBranchName: activeBranchId ? undefined : 'Barcha filiallar',
    totalBranches: (branches as any[])?.length ?? 0,
    alertCount: pendingDisciplineList.length,
    pendingApprovals: pendingLeaveList.length,
    riskSignals: 0, // Phase 2: removed AI dependency — show 0 unless real data
    attendancePct: presentPct > 0 ? presentPct : null,
    staffTotal: teacherCount + staffCount,
    revenueGrowth: financeData?.revenueGrowth ?? null,
  }), [activeBranchId, branches, pendingDisciplineList.length, pendingLeaveList.length, presentPct, teacherCount, staffCount, financeData?.revenueGrowth]);

  const handleSelectBranch = useCallback((branch: BranchDetail) => {
    setSelectedBranch(branch);
    setPanelOpen(true);
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
        <div className="xedu-emerald-mineral rounded-2xl p-4 md:p-5 space-y-6">

          {/* 1. Approval Preview — count + link, no inline actions */}
          <ApprovalPreview
            pendingLeaves={pendingLeaveList.length}
            pendingDiscipline={pendingDisciplineList.length}
            isLoading={!pendingLeaves}
          />

          {/* 2. Branch Health Map */}
          <BranchHealthMap
            branches={(branches as any[]) ?? []}
            allUsers={allUsers}
            pendingLeaves={pendingLeaveList}
            pendingDiscipline={pendingDisciplineList}
            isLoading={branchesLoading}
            selectedBranchId={selectedBranch?.id}
            onSelectBranch={handleSelectBranch}
          />

          {/* 3. Finance Pulse */}
          <FinancialPulse
            financeData={financeData as any}
            isLoading={!financeData && !attLoading}
          />

          {/* 4. Academic Overview */}
          <AcademicSnapshot
            attendanceSummary={attendanceSummary as any}
            classCount={classList.length}
            activeStudents={studentCount}
            upcomingExams={upcomingExamsCount}
            isLoading={attLoading}
          />

          {/* 5. Staff Overview */}
          <StaffOperations
            teacherCount={teacherCount}
            staffCount={staffCount}
            pendingLeaves={pendingLeaveList.length}
            pendingDiscipline={pendingDisciplineList.length}
            isLoading={!usersData}
          />

          {/* 6. Quick Actions */}
          <QuickActionsGrid />

        </div>
      </WorkspaceMain>

      {/* ── Right Sidebar ───────────────────────────────────────────────────── */}
      <WorkspaceSidebar width="normal">
        <div className="xedu-intelligence-surface rounded-2xl p-3 md:p-4 space-y-4">

          {/* KPI Snapshot */}
          <KpiSnapshotCard kpiData={kpiData} />

          {/* Recent Operations Summary */}
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

          {/* Today widget */}
          <WorkspaceSection
            title="Bugun"
            icon={<Clock className="h-4 w-4" />}
            density="compact"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300">
                {dayLabel}
              </p>
              <p className="text-xs text-xedu-slate-500 mt-0.5">
                {(branches as any[])?.length ?? 0} ta filial · {teacherCount + staffCount} ta xodim · {studentCount} ta o'quvchi
              </p>
            </div>
          </WorkspaceSection>

        </div>
      </WorkspaceSidebar>
    </WorkspaceShell>
  );
}

// ── Approval Preview ──────────────────────────────────────────────────────────

function ApprovalPreview({
  pendingLeaves,
  pendingDiscipline,
  isLoading,
}: {
  pendingLeaves: number;
  pendingDiscipline: number;
  isLoading: boolean;
}) {
  const router = useRouter();
  const total = pendingLeaves + pendingDiscipline;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-xedu-border">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-xedu-slate-500" />
          <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">Tasdiqlash inbox</h3>
        </div>
        {total > 0 && (
          <Badge variant="destructive">{total} ta kutilmoqda</Badge>
        )}
      </div>

      <div className="divide-y divide-xedu-border">
        <ApprovalRow
          label="Ta'til so'rovlari"
          count={pendingLeaves}
          href="/dashboard/approvals"
          icon={Clock}
        />
        <ApprovalRow
          label="Intizom holatlari"
          count={pendingDiscipline}
          href="/dashboard/alerts"
          icon={Bell}
        />
      </div>

      <div className="px-4 py-2.5 border-t border-xedu-border">
        <button
          onClick={() => router.push('/dashboard/approvals')}
          className="w-full text-xs font-semibold text-xedu-primary hover:text-xedu-primary-hover transition-colors"
        >
          Barchasini ko'rish →
        </button>
      </div>
    </div>
  );
}

function ApprovalRow({
  label,
  count,
  href,
  icon: Icon,
}: {
  label: string;
  count: number;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-xedu-slate-400" />
        <span className="text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-sm font-bold tabular-nums',
          count > 0 ? 'text-xedu-ruby-600' : 'text-xedu-slate-400'
        )}>
          {count}
        </span>
        <ChevronRight className="h-4 w-4 text-xedu-slate-300" />
      </div>
    </Link>
  );
}

// ── Quick Actions Grid ────────────────────────────────────────────────────────

function QuickActionsGrid() {
  const router = useRouter();

  const actions = [
    { label: 'Tasdiqlash inbox', href: '/dashboard/approvals', icon: FileText, color: '#DC2626' },
    { label: 'Filiallar', href: '/dashboard/branches', icon: Building2, color: '#2563EB' },
    { label: 'Xodimlar', href: '/dashboard/staff', icon: Briefcase, color: '#7C3AED' },
    { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users, color: '#0891B2' },
    { label: 'Ish haqi', href: '/dashboard/payroll', icon: TrendingUp, color: '#0F7B53' },
    { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart3, color: '#D97706' },
    { label: 'Operatsion markaz', href: '/dashboard/ops', icon: Zap, color: '#4338CA' },
    { label: 'Sozlamalar', href: '/dashboard/settings', icon: Shield, color: '#64748B' },
  ];

  return (
    <div className="rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail">
        <Zap className="h-4 w-4 text-xedu-slate-500" />
        <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">Tezkor harakatlar</h3>
      </div>
      <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map(({ label, href, icon: Icon, color }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all',
              'hover:-translate-y-[1px] hover:shadow-sm hover:border-xedu-slate-200',
              'border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg-elevated'
            )}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${color}18` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
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
          <span className="text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300">{item.label}</span>
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
          <p className="text-xs font-medium mt-0.5 text-xedu-slate-500">
            Aktiv metrika
          </p>
        </>
      ) : (
        <>
          <p className="text-xl font-black leading-none tracking-tight text-xedu-slate-400">
            —
          </p>
          <p className="text-xs font-medium mt-0.5 text-xedu-slate-500">
            Ma&apos;lumot yo&apos;q
          </p>
        </>
      )}
    </Link>
  );
});
