'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users, School, CreditCard, ClipboardCheck, Calendar,
  GraduationCap, BookOpen, ShieldAlert, FileText, TrendingUp,
  AlertCircle, CheckCircle2, ArrowUpRight, Bell,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, getRoleLabel } from '@/lib/utils';

import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { paymentsApi } from '@/lib/api/payments';
import { attendanceApi } from '@/lib/api/attendance';
import { scheduleApi } from '@/lib/api/schedule';
import { examsApi } from '@/lib/api/exams';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { financeApi } from '@/lib/api/finance';

import {
  C, ICON_CFG, StatCard, PCard, SectionHeader, QuickActions,
  TodayScheduleWidget, AttendanceSummaryWidget, UpcomingExamsWidget,
  AcademicCalendarWidget,
} from './shared-widgets';

export function BranchAdminDashboard() {
  const { user, activeBranchId, _hasHydrated } = useAuthStore();

  const dayLabel = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  const branchReady = _hasHydrated && !!activeBranchId;

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'branch', activeBranchId],
    queryFn: () => usersApi.getAll({ limit: 200 }),
    enabled: branchReady,
  });

  const isVP = user?.role === 'vice_principal';

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
    enabled: branchReady,
  });

  const { data: attendanceSummary, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'today-summary', activeBranchId],
    queryFn: attendanceApi.getTodaySummary,
    enabled: branchReady,
  });

  const { data: paymentReport, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', 'report', activeBranchId],
    queryFn: paymentsApi.getReport,
    // VP has no access to /payments/report endpoint — skip to avoid 403 toast
    enabled: branchReady && !isVP,
  });

  const { data: financeData } = useQuery({
    queryKey: ['finance', 'dashboard', activeBranchId],
    // Optional widget — suppress 403/404 so global toast doesn't fire
    queryFn: () => financeApi.getDashboard().catch(() => null),
    enabled: branchReady,
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['leave-requests', 'pending', activeBranchId],
    queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }).catch(() => null),
    enabled: branchReady,
  });

  const { data: pendingDiscipline } = useQuery({
    queryKey: ['discipline', 'unresolved', activeBranchId],
    queryFn: () => disciplineApi.getAll().catch(() => ({ data: [] })),
    enabled: branchReady,
  });

  const allUsers: any[] = (usersData as any)?.data ?? [];
  const classList: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const studentCount = allUsers.filter((u: any) => u.role === 'student').length;
  const teacherCount = allUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length;
  const staffCount   = allUsers.filter((u: any) => !['student', 'teacher', 'class_teacher', 'parent'].includes(u.role)).length;

  const presentPct    = (attendanceSummary as any)?.presentPct ?? 0;
  const totalStudents = (attendanceSummary as any)?.totalStudents ?? 0;

  const pendingLeaveList: any[]  = (pendingLeaves as any)?.data ?? pendingLeaves ?? [];
  const pendingDisciplineList: any[] = (pendingDiscipline as any)?.data ?? [];
  const debtors: any[] = paymentReport?.debtors ?? [];

  // isVP is declared above near branchReady

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[32px] font-black tracking-tight leading-none" style={{ color: C.text }}>
          {isVP ? "O'rinbosar boshqaruvi" : 'Filial boshqaruvi'}
        </h1>
        <p className="text-sm mt-2 font-medium" style={{ color: C.muted }}>
          {getRoleLabel(user?.role ?? '')} &middot; {dayLabel}
        </p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="O'quvchilar"
          value={studentCount}
          icon={Users}
          description="Filialdagi jami"
          color="blue"
          loading={!branchReady || usersLoading}
          href="/dashboard/students"
        />
        <StatCard
          title="Xodimlar"
          value={teacherCount + staffCount}
          icon={School}
          description={`${teacherCount} o'qituvchi · ${staffCount} xodim`}
          color="violet"
          loading={!branchReady || usersLoading}
          href="/dashboard/staff"
        />
        <StatCard
          title="Bugungi davomat"
          value={`${presentPct}%`}
          icon={ClipboardCheck}
          description={`${totalStudents} ta o'quvchidan`}
          color="emerald"
          trend={presentPct >= 90 ? 'up' : 'down'}
          loading={!branchReady || attLoading}
          href="/dashboard/attendance"
        />
        {!isVP && (
          <StatCard
            title="Qarzdorlik"
            value={formatCurrency(paymentReport?.overdue ?? 0)}
            icon={CreditCard}
            description="Kechikkan to'lovlar"
            color="red"
            trend="down"
            loading={paymentsLoading}
            href="/dashboard/payments"
          />
        )}
      </div>

      {/* ── Operations grid ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <TodayScheduleWidget />
        <AttendanceSummaryWidget />
        <UpcomingExamsWidget />

        {/* Pending leave requests */}
        <PCard>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>Ta'til so'rovlari</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                {pendingLeaveList.length} ta kutilmoqda
              </p>
            </div>
            {pendingLeaveList.length > 0 && (
              <Badge variant="destructive">{pendingLeaveList.length} ta</Badge>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingLeaveList.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <CheckCircle2 className="h-7 w-7 text-xedu-primary" />
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
                  <Link
                    href="/dashboard/leave-requests"
                    className="text-xs font-semibold shrink-0 ml-3"
                    style={{ color: C.primary }}
                  >
                    Ko'rish →
                  </Link>
                </div>
              ))
            )}
          </div>
        </PCard>

        {/* Pending discipline */}
        {pendingDisciplineList.length > 0 && (
          <PCard>
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
              <p className="font-bold text-[15px]" style={{ color: C.text }}>Intizom holatlari</p>
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
            </div>
          </PCard>
        )}

        {/* Debtors — branch_admin only */}
        {!isVP && debtors.length > 0 && (
          <PCard>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-[15px]" style={{ color: C.text }}>Qarzdorlar</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>Kechikkan va kutilayotgan to'lovlar</p>
              </div>
              <Link href="/dashboard/payments" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</Link>
            </div>
            <div className="space-y-2">
              {debtors.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: C.text }}>{d.student?.firstName} {d.student?.lastName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: C.text }}>{formatCurrency(d.amount)}</span>
                    <Badge variant={d.status === 'overdue' ? 'destructive' : 'warning'}>
                      {d.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </PCard>
        )}

        {/* Classes */}
        {classList.length > 0 && (
          <PCard>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-[15px]" style={{ color: C.text }}>Sinflar</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{classList.length} ta sinf</p>
              </div>
              <Link href="/dashboard/classes" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</Link>
            </div>
            <div className="space-y-2">
              {classList.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                  <span className="font-medium text-sm" style={{ color: C.text }}>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{c._count?.students ?? 0} o'quvchi</Badge>
                    <span className="text-xs" style={{ color: C.muted }}>{c.academicYear}</span>
                  </div>
                </div>
              ))}
            </div>
          </PCard>
        )}

        {/* Quick actions */}
        <PCard>
          <p className="font-bold text-[15px] mb-5" style={{ color: C.text }}>Tezkor harakatlar</p>
          <QuickActions items={isVP ? [
            { label: 'Davomat',      href: '/dashboard/attendance',         icon: ClipboardCheck, iconColor: ICON_CFG.emerald.icon },
            { label: 'Baholar',      href: '/dashboard/grades',             icon: BookOpen,       iconColor: ICON_CFG.blue.icon },
            { label: 'Dars jadvali', href: '/dashboard/schedule',           icon: Calendar,       iconColor: ICON_CFG.violet.icon },
            { label: "O'quvchilar",  href: '/dashboard/students',           icon: Users,          iconColor: ICON_CFG.amber.icon },
            { label: 'Intizom',      href: '/dashboard/discipline',         icon: FileText,       iconColor: ICON_CFG.red.icon },
            { label: "Ta'til so'rov",href: '/dashboard/leave-requests',     icon: GraduationCap,  iconColor: ICON_CFG.cyan.icon },
          ] : [
            { label: 'Davomat',      href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: ICON_CFG.emerald.icon },
            { label: 'Baholar',      href: '/dashboard/grades',     icon: BookOpen,       iconColor: ICON_CFG.blue.icon },
            { label: 'Dars jadvali', href: '/dashboard/schedule',   icon: Calendar,       iconColor: ICON_CFG.violet.icon },
            { label: "O'quvchilar",  href: '/dashboard/students',   icon: Users,          iconColor: ICON_CFG.amber.icon },
            { label: 'Xodimlar',     href: '/dashboard/staff',      icon: School,         iconColor: ICON_CFG.cyan.icon },
            { label: "To'lovlar",    href: '/dashboard/payments',   icon: CreditCard,     iconColor: ICON_CFG.indigo.icon },
          ]} />
        </PCard>
      </div>

      {/* ── Academic Calendar ── */}
      <AcademicCalendarWidget canEdit={true} />
    </div>
  );
}
