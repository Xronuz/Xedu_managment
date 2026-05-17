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

export function LibrarianDashboard() {
  const { user, activeBranchId } = useAuthStore();

  const { data: libStats, isLoading } = useQuery({
    queryKey: ['library', 'stats', activeBranchId],
    queryFn: async () => {
      try {
        const { data } = await (await import('@/lib/api/client')).apiClient.get('/library/stats');
        return data;
      } catch {
        return { totalBooks: 0, activeLoans: 0, overdueLoans: 0, availableBooks: 0 };
      }
    },
  });

  const { data: overdueLoans = [], isLoading: overdueLoading } = useQuery({
    queryKey: ['library', 'overdue', activeBranchId],
    queryFn: async () => {
      try {
        const { data } = await (await import('@/lib/api/client')).apiClient.get('/library/loans', { params: { status: 'overdue', limit: 10 } });
        return data?.data ?? [];
      } catch { return []; }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none" style={{ color: C.text }}>Kutubxona boshqaruvi</h1>
          <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>Kutubxonachi — {user?.firstName}</p>
        </div>
        <Button asChild><a href="/dashboard/library"><Library className="mr-2 h-4 w-4" />Kutubxona</a></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Jami kitoblar"    value={isLoading ? '...' : (libStats?.totalBooks ?? 0)}    icon={BookOpen}      description="Katalogdagi kitoblar" loading={isLoading} color="blue"    />
        <StatCard title="Mavjud kitoblar"  value={isLoading ? '...' : (libStats?.availableBooks ?? 0)}icon={BookCopy}      description="Berilishi mumkin"    loading={isLoading} color="emerald" />
        <StatCard title="Faol ijaralar"    value={isLoading ? '...' : (libStats?.activeLoans ?? 0)}   icon={ClipboardCheck}description="Berilgan kitoblar"   loading={isLoading} color="violet"  />
        <StatCard title="Muddati o'tgan"  value={isLoading ? '...' : (libStats?.overdueLoans ?? 0)}  icon={Hourglass}     description="Qaytarilmagan"       loading={isLoading} color="red"     />
      </div>

      <PCard>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-[15px]" style={{ color: C.text }}>Muddati o'tgan kitoblar</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>Qaytarilmagan va kechikkan ijaralar</p>
          </div>
          <a href="/dashboard/library" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</a>
        </div>
        {overdueLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
        ) : (overdueLoans as any[]).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <CheckCircle2 className="h-8 w-8 text-xedu-primary" />
            <p className="text-sm" style={{ color: C.muted }}>Hamma kitoblar o'z vaqtida qaytarilgan!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(overdueLoans as any[]).map((loan: any, i: number) => (
              <div key={loan.id ?? i} className="flex items-center justify-between rounded-[14px] border border-red-100 p-3.5">
                <div>
                  <p className="font-medium text-sm" style={{ color: C.text }}>{loan.book?.title ?? 'Noma‘lum kitob'}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{loan.user?.firstName} {loan.user?.lastName}</p>
                </div>
                <div className="text-right">
                  <Badge variant="destructive">
                    {loan.dueDate ? `${Math.ceil((Date.now() - new Date(loan.dueDate).getTime()) / 86400000)} kun` : 'Kechikkan'}
                  </Badge>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('uz-UZ') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </PCard>

      {/* Akademik Kalendar — readonly ota-onalar uchun */}
      <AcademicCalendarWidget canEdit={false} />
    </div>
  );
}

// ── School Dashboard (main) ────────────────────────────────────────────────────
