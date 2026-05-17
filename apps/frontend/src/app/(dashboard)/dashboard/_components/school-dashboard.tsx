'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, School, CreditCard, TrendingUp, TrendingDown,
  AlertCircle, Globe, CheckCircle2, Building2, LayoutGrid,
  BookOpen, BookMarked, ClipboardCheck, Calendar, GraduationCap, ChevronRight,
  Rocket, X, Library, BookCopy, Hourglass, DollarSign, BarChart2, Coins,
  CalendarOff, ShieldAlert, CalendarCheck, Activity, Bell, ArrowUpRight, Server,
  CalendarDays, Plus, Pencil, Trash2 as Trash2Icon,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrency, getRoleLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { paymentsApi } from '@/lib/api/payments';
import { superAdminApi } from '@/lib/api/super-admin';
import { parentApi } from '@/lib/api/parent';
import { scheduleApi } from '@/lib/api/schedule';
import { attendanceApi } from '@/lib/api/attendance';
import { examsApi } from '@/lib/api/exams';
import { homeworkApi } from '@/lib/api/homework';
import { subjectsApi } from '@/lib/api/subjects';
import { gradesApi } from '@/lib/api/grades';
import { coinsApi } from '@/lib/api/coins';
import { kpiApi } from '@/lib/api/kpi';
import { aiAnalyticsApi } from '@/lib/api/ai-analytics';
import { branchesApi } from '@/lib/api/branches';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { academicCalendarApi, type AcademicEventType, type CreateAcademicEventPayload } from '@/lib/api/academic-calendar';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { financeApi } from '@/lib/api/finance';
import { notificationsApi } from '@/lib/api/notifications';

import {
  C, ICON_CFG, LEGACY_COLOR_MAP, StatCard, PCard, SectionHeader, QuickActions,
  TodayScheduleWidget, AttendanceSummaryWidget,
  UpcomingExamsWidget, ClassTeacherMyClassSection, TeacherKPISection,
  VicePrincipalSection, AdminChartsSection, AcademicCalendarWidget,
  SuperAdminServiceStatus, MONTH_LABELS, PIE_COLORS, FREQ_UZ
} from './shared-widgets';

export function SchoolDashboard() {
  const { user, activeBranchId } = useAuthStore();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'count', activeBranchId],
    queryFn: () => usersApi.getAll({ limit: 100 }),
    enabled: ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? ''),
  });

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
    enabled: ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'].includes(user?.role ?? ''),
  });

  const { data: paymentReport, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', 'report', activeBranchId],
    queryFn: paymentsApi.getReport,
    enabled: ['director', 'accountant'].includes(user?.role ?? ''),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', 'count', activeBranchId],
    queryFn: () => subjectsApi.getAll(),
    enabled: ['director', 'branch_admin'].includes(user?.role ?? ''),
  });

  const classList     = Array.isArray(classesData) ? classesData : [];
  const subjectsCount = Array.isArray(subjectsData) ? subjectsData.length : 0;

  const dayLabel = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const calendarCanEdit = ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '');

  return (
    <div className="space-y-6">
      {/* ── Welcome header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none" style={{ color: C.text }}>
            {getRoleLabel(user?.role ?? '')}
          </h1>
          <p className="text-sm mt-2 font-medium" style={{ color: C.muted }}>
            {dayLabel}
          </p>
        </div>
      </div>

      {/* ── Onboarding ── */}
      {user?.role === 'director' && (
        <OnboardingChecklist />
      )}

      {/* ── Vice principal ── */}
      {user?.role === 'vice_principal' && <VicePrincipalSection />}

      {/* ── Charts (admin / VP) ── */}
      {['director', 'vice_principal'].includes(user?.role ?? '') && <AdminChartsSection />}

      {/* ── Class teacher: my class ── */}
      {user?.role === 'class_teacher' && <ClassTeacherMyClassSection />}

      {/* ── Teacher KPIs ── */}
      {['teacher', 'class_teacher'].includes(user?.role ?? '') && <TeacherKPISection />}

      {/* ── Stat cards row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '') && (
          <StatCard title="Foydalanuvchilar" value={usersData?.meta.total ?? 0}      icon={Users}      description="Aktiv foydalanuvchilar" color="violet"  loading={usersLoading}   href="/dashboard/users" />
        )}
        {!['student', 'parent'].includes(user?.role ?? '') && (
          <StatCard title="Sinflar"           value={classList.length}               icon={School}     description="Aktiv sinflar"         color="blue"    loading={classesLoading} href="/dashboard/classes" />
        )}
        {['director', 'accountant'].includes(user?.role ?? '') && (
          <>
            <StatCard title="Bu oy tushumi" value={formatCurrency(paymentReport?.monthly?.paid ?? 0)} icon={CreditCard}   trend="up"   description="Oylik tushum"       color="emerald" loading={paymentsLoading} href="/dashboard/payments" />
            <StatCard title="Qarzdorlar"    value={formatCurrency(paymentReport?.overdue ?? 0)}       icon={AlertCircle} trend="down" description="Kechikkan to'lovlar" color="red"     loading={paymentsLoading} href="/dashboard/payments" />
          </>
        )}
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {['director', 'vice_principal', 'class_teacher', 'teacher', 'branch_admin'].includes(user?.role ?? '') && (
          <AttendanceSummaryWidget />
        )}
        {['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'].includes(user?.role ?? '') && (
          <UpcomingExamsWidget />
        )}
        {['teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin'].includes(user?.role ?? '') && (
          <TodayScheduleWidget />
        )}

        {/* Debtors list */}
        {['director', 'accountant'].includes(user?.role ?? '') && (paymentReport?.debtors?.length ?? 0) > 0 && (
          <PCard>
            <p className="font-bold text-[15px] mb-1" style={{ color: C.text }}>Qarzdorlar</p>
            <p className="text-xs mb-5" style={{ color: C.muted }}>Kechikkan va kutilayotgan to'lovlar</p>
            <div className="space-y-2">
              {paymentReport.debtors.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: C.text }}>{d.student.firstName} {d.student.lastName}</span>
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

        {/* Classes list */}
        {classList.length > 0 && (
          <PCard>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-[15px]" style={{ color: C.text }}>Sinflar</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{classList.length} ta sinf ro'yxatda</p>
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
          {user?.role === 'director' && (
            <QuickActions items={[
              { label: 'Foydalanuvchi qo‘sh', href: '/dashboard/users',      icon: Users,         iconColor: '#7C3AED' },
              { label: 'Davomat',              href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
              { label: "To'lovlar",            href: '/dashboard/payments',   icon: CreditCard,     iconColor: '#2563EB' },
              { label: 'Hisobotlar',           href: '/dashboard/reports',    icon: BookOpen,       iconColor: '#D97706' },
            ]} />
          )}
          {['teacher', 'class_teacher'].includes(user?.role ?? '') && (
            <QuickActions items={[
              { label: 'Davomat belgi', href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
              { label: 'Baho qo‘sh',   href: '/dashboard/grades',     icon: BookOpen,       iconColor: '#2563EB' },
              { label: 'Uy vazifasi',   href: '/dashboard/homework',   icon: Calendar,       iconColor: '#7C3AED' },
              { label: 'Imtihon',       href: '/dashboard/exams',      icon: GraduationCap,  iconColor: '#D97706' },
            ]} />
          )}
          {user?.role === 'accountant' && (
            <QuickActions items={[
              { label: "To'lov qabul", href: '/dashboard/payments',  icon: CreditCard,     iconColor: C.primary },
              { label: 'Maosh',        href: '/dashboard/payroll',   icon: BookOpen,       iconColor: '#2563EB' },
              { label: 'Hisobot',      href: '/dashboard/reports',   icon: Calendar,       iconColor: '#7C3AED' },
              { label: 'Sozlamalar',   href: '/dashboard/settings',  icon: GraduationCap,  iconColor: '#D97706' },
            ]} />
          )}
          {user?.role === 'vice_principal' && (
            <QuickActions items={[
              { label: 'Davomat',      href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
              { label: 'Baholar',      href: '/dashboard/grades',     icon: BookOpen,       iconColor: '#2563EB' },
              { label: 'Dars jadvali', href: '/dashboard/schedule',   icon: Calendar,       iconColor: '#7C3AED' },
              { label: 'Hisobot',      href: '/dashboard/reports',    icon: GraduationCap,  iconColor: '#D97706' },
            ]} />
          )}
          {user?.role === 'branch_admin' && (
            <QuickActions items={[
              { label: 'Davomat',      href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
              { label: 'Baholar',      href: '/dashboard/grades',     icon: BookOpen,       iconColor: '#2563EB' },
              { label: 'Dars jadvali', href: '/dashboard/schedule',   icon: Calendar,       iconColor: '#7C3AED' },
              { label: "O'quvchilar",  href: '/dashboard/students',   icon: Users,          iconColor: '#D97706' },
            ]} />
          )}
          {user?.role === 'librarian' && (
            <QuickActions items={[
              { label: 'Kitoblar',   href: '/dashboard/library',   icon: BookOpen,      iconColor: '#2563EB' },
              { label: 'Xabarlar',  href: '/dashboard/messages',  icon: Calendar,      iconColor: '#7C3AED' },
              { label: 'Sozlamalar',href: '/dashboard/settings',  icon: GraduationCap, iconColor: '#D97706' },
            ]} />
          )}
        </PCard>
      </div>

      {/* Akademik Kalendar — rol asosida CRUD yoki readonly */}
      <AcademicCalendarWidget canEdit={calendarCanEdit} />
    </div>
  );
}

// ── Parent Dashboard ───────────────────────────────────────────────────────────
