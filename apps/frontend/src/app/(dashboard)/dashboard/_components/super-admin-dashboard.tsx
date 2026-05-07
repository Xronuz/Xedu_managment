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
import { academicCalendarApi, type AcademicEventType, type CreateAcademicEventPayload } from '@/lib/api/academic-calendar';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { financeApi } from '@/lib/api/finance';
import { notificationsApi } from '@/lib/api/notifications';

import {
  C, ICON_CFG, LEGACY_COLOR_MAP, StatCard, PCard, SectionHeader, QuickActions,
  OnboardingChecklist, TodayScheduleWidget, AttendanceSummaryWidget,
  UpcomingExamsWidget, ClassTeacherMyClassSection, TeacherKPISection,
  VicePrincipalSection, AdminChartsSection, AcademicCalendarWidget,
  SuperAdminServiceStatus, MONTH_LABELS, PIE_COLORS, FREQ_UZ
} from './shared-widgets';

export function SuperAdminDashboard() {
  const { data: stats, isLoading }          = useQuery({ queryKey: ['super-admin', 'stats'],   queryFn: superAdminApi.getStats });
  const { data: schools, isLoading: schoolsLoading } = useQuery({ queryKey: ['super-admin', 'schools'], queryFn: () => superAdminApi.getSchools({ limit: 5 }) });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none" style={{ color: C.text }}>Platform boshqaruvi</h1>
          <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>EduPlatform — Super Admin paneli</p>
        </div>
        <Button asChild><Link href="/dashboard/schools"><Building2 className="mr-2 h-4 w-4" />Maktablar</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Jami maktablar"       value={isLoading ? '...' : (stats?.schoolCount ?? 0)}          icon={School}       description="Aktiv maktablar"              color="blue"    loading={isLoading} />
        <StatCard title="Jami foydalanuvchilar" value={isLoading ? '...' : (stats?.userCount ?? 0)}            icon={Users}        description="Barcha maktablar bo'yicha"    color="violet"  loading={isLoading} />
        <StatCard title="Aktiv subscriptionlar" value={isLoading ? '...' : (stats?.activeSubscriptions ?? 0)} icon={CheckCircle2} description="To'lov qilayotgan maktablar" color="emerald" loading={isLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-[14px]" style={{ color: C.text }}>So'nggi maktablar</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Platformdagi barcha maktablar</p>
            </div>
            <Link href="/dashboard/schools" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</Link>
          </div>
          {schoolsLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-1.5">
              {(schools?.data ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border p-2.5" style={{ borderColor: C.border }}>
                  <div>
                    <p className="font-medium text-xs" style={{ color: C.text }}>{s.name}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{s.slug}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={s.isActive ? 'success' : 'destructive'}>{s.isActive ? 'Aktiv' : 'Bloklangan'}</Badge>
                    <Badge variant="secondary">{s._count?.users ?? 0} user</Badge>
                  </div>
                </div>
              ))}
              {(!schools?.data || schools.data.length === 0) && (
                <p className="py-4 text-center text-sm" style={{ color: C.muted }}>Maktablar yo'q</p>
              )}
            </div>
          )}
        </PCard>

        <PCard className="p-5">
          <p className="font-bold text-[14px] mb-4" style={{ color: C.text }}>Tezkor harakatlar</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Yangi maktab',     href: '/dashboard/schools/new', icon: Building2,  iconColor: '#2563EB' },
              { label: 'Foydalanuvchilar', href: '/dashboard/users',       icon: Users,       iconColor: '#7C3AED' },
              { label: 'Modullar',         href: '/dashboard/schools',     icon: LayoutGrid,  iconColor: '#D97706' },
              { label: 'Sozlamalar',       href: '/dashboard/settings',    icon: Globe,       iconColor: C.primary },
            ].map(({ label, href, icon: Icon, iconColor }) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-2 rounded-[14px] border p-3 text-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                style={{ borderColor: C.border }}
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: C.bg }}>
                  <Icon className="h-4 w-4" style={{ color: iconColor }} />
                </div>
                <span className="text-[11px] font-semibold leading-tight" style={{ color: C.text }}>{label}</span>
              </Link>
            ))}
          </div>
        </PCard>

        <PCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-4 w-4" style={{ color: C.primary }} />
            <p className="font-bold text-[14px]" style={{ color: C.text }}>Servislar holati</p>
          </div>
          <SuperAdminServiceStatus />
        </PCard>
      </div>
    </div>
  );
}

// ── Librarian Dashboard ────────────────────────────────────────────────────────
