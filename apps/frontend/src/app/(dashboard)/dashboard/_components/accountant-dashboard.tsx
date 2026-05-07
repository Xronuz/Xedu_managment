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

export function AccountantDashboard() {
  const { user, activeBranchId } = useAuthStore();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

  const { data: paymentReport, isLoading: reportLoading } = useQuery({ queryKey: ['payments', 'report', activeBranchId], queryFn: paymentsApi.getReport });
  const { data: paymentHistory, isLoading: histLoading } = useQuery({
    queryKey: ['payments', 'history', 'trend', activeBranchId],
    queryFn: () => paymentsApi.getHistory({ from: sixMonthsAgo, limit: 500 }),
  });

  const monthlyData = (() => {
    const months: Record<string, { paid: number; pending: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { paid: 0, pending: 0 };
    }
    const list: any[] = paymentHistory?.data ?? [];
    list.forEach((p: any) => {
      const key = (p.paidAt ?? p.createdAt ?? '').slice(0, 7);
      if (!(key in months)) return;
      if (p.status === 'paid') months[key].paid += p.amount ?? 0;
      else months[key].pending += p.amount ?? 0;
    });
    return Object.entries(months).map(([key, val]) => {
      const [, mo] = key.split('-');
      return { month: MONTH_LABELS[parseInt(mo) - 1], ...val };
    });
  })();

  const pieData = [
    { name: "To'langan", value: paymentReport?.monthly?.paid ?? 0 },
    { name: 'Kechikkan',  value: paymentReport?.overdue ?? 0 },
    { name: 'Kutilmoqda', value: paymentReport?.monthly?.pending ?? 0 },
  ].filter(d => d.value > 0);

  const totalRevenue = paymentReport?.monthly?.paid ?? 0;
  const overdueAmt   = paymentReport?.overdue ?? 0;
  const debtors: any[] = paymentReport?.debtors ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none" style={{ color: C.text }}>
            Moliya boshqaruvi
          </h1>
          <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>Hisobchi — {user?.firstName}</p>
        </div>
        <Button asChild><a href="/dashboard/payments"><CreditCard className="mr-2 h-4 w-4" />To&apos;lovlar</a></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Bu oy tushumi"       value={formatCurrency(totalRevenue)} icon={DollarSign}  trend="up"   description="Oylik tushum"       loading={reportLoading} color="emerald" />
        <StatCard title="Kechikkan to'lovlar" value={formatCurrency(overdueAmt)}   icon={AlertCircle} trend="down" description="Qarzdorlik miqdori" loading={reportLoading} color="red"     />
        <StatCard title="Qarzdorlar soni"     value={debtors.length}               icon={Users}       description="Aktiv qarzdorlar"   loading={reportLoading} color="amber"   />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PCard>
          <p className="font-bold text-[15px] mb-1" style={{ color: C.text }}>Oylik tushum dinamikasi</p>
          <p className="text-xs mb-5" style={{ color: C.muted }}>So'nggi 6 oy (so'm)</p>
          {histLoading ? <Skeleton className="h-52" /> : (
            <ResponsiveContainer width="100%" height={208}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'paid' ? "To'langan" : 'Kutilmoqda']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: C.shadow, fontSize: 12 }} />
                <Bar dataKey="paid"    fill={C.primary} radius={[6, 6, 0, 0]} stackId="a" maxBarSize={36} />
                <Bar dataKey="pending" fill="#F59E0B"   radius={[6, 6, 0, 0]} stackId="a" maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </PCard>

        <PCard>
          <p className="font-bold text-[15px] mb-1" style={{ color: C.text }}>To'lov holati</p>
          <p className="text-xs mb-5" style={{ color: C.muted }}>Bu oy — To'langan / Kutilmoqda / Kechikkan</p>
          <div className="flex items-center justify-center">
            {reportLoading ? <Skeleton className="h-52 w-52 rounded-full" /> : pieData.length === 0 ? (
              <p className="py-10 text-sm font-medium" style={{ color: C.muted }}>Ma'lumot mavjud emas</p>
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: C.shadow, fontSize: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </PCard>
      </div>

      {debtors.length > 0 && (
        <PCard>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>Qarzdorlar ro'yxati</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Eng katta qarzdorliklar</p>
            </div>
            <a href="/dashboard/payments" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</a>
          </div>
          <div className="space-y-2">
            {debtors.slice(0, 8).map((d: any, i: number) => (
              <div key={d.id ?? i} className="flex items-center justify-between rounded-[14px] border p-3.5" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-3">
                  <span
                    className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: C.border, color: C.muted }}
                  >{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{d.student?.firstName} {d.student?.lastName}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{d.student?.class?.name ?? ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-500 text-sm">{formatCurrency(d.amount)}</span>
                  <Badge variant={d.status === 'overdue' ? 'destructive' : 'warning'}>
                    {d.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </PCard>
      )}
    </div>
  );
}

// ── Super Admin Dashboard ──────────────────────────────────────────────────────
