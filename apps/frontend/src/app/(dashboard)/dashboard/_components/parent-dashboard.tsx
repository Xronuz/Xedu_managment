'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, School, CreditCard, TrendingUp, TrendingDown,
  AlertCircle, Globe, CheckCircle2, Building2, LayoutGrid,
  BookOpen, BookMarked, ClipboardCheck, Calendar, GraduationCap, ChevronRight,
  Rocket, X, Library, BookCopy, Hourglass, DollarSign, BarChart2,
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
  TodayScheduleWidget, AttendanceSummaryWidget,
  UpcomingExamsWidget, ClassTeacherMyClassSection, TeacherKPISection,
  VicePrincipalSection, AdminChartsSection, AcademicCalendarWidget,
  SuperAdminServiceStatus, MONTH_LABELS, PIE_COLORS, FREQ_UZ
} from './shared-widgets';

export function ParentDashboard() {
  const { user, activeBranchId }    = useAuthStore();
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const { data: children = [], isLoading: childrenLoading } = useQuery({ queryKey: ['parent', 'children', activeBranchId], queryFn: parentApi.getChildren });
  const childList: any[] = Array.isArray(children) ? children : [];
  const activeChild = selectedChildId || childList[0]?.id;

  const { data: attendance }    = useQuery({ queryKey: ['parent', 'attendance', activeChild, activeBranchId], queryFn: () => parentApi.getChildAttendance(activeChild),  enabled: !!activeChild });
  const { data: gradesData }    = useQuery({ queryKey: ['parent', 'grades',     activeChild, activeBranchId], queryFn: () => parentApi.getChildGrades(activeChild),     enabled: !!activeChild });
  const { data: payments }      = useQuery({ queryKey: ['parent', 'payments',   activeChild, activeBranchId], queryFn: () => parentApi.getChildPayments(activeChild),   enabled: !!activeChild });
  const { data: upcomingExams = [] } = useQuery({ queryKey: ['parent', 'exams',      activeChild, activeBranchId], queryFn: () => examsApi.getUpcoming(14), enabled: !!activeChild });

  const grades: any[]       = gradesData?.grades ?? [];
  const attendanceStats     = attendance ?? {};
  const paymentList: any[]  = Array.isArray(payments) ? payments : [];
  const pending             = paymentList.filter((p: any) => p.status === 'pending' || p.status === 'overdue');

  const gpaTrend = [...grades]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map((g: any) => ({
      date: new Date(g.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
      pct:  g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0,
    }));

  const nextExams: any[] = (Array.isArray(upcomingExams) ? upcomingExams : []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-black tracking-tight leading-none" style={{ color: C.text }}>
          Farzandlaringiz
        </h1>
        <p className="text-sm mt-2 font-medium" style={{ color: C.muted }}>O&apos;qish holati va rivojlanish</p>
      </div>

      {childList.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {childList.map((child: any) => (
            <Button key={child.id} variant={activeChild === child.id ? 'default' : 'outline'} size="sm"
              onClick={() => setSelectedChildId(child.id)}>
              {child.firstName} {child.lastName}
            </Button>
          ))}
        </div>
      )}

      {childrenLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-[22px]" />)}</div>
      ) : childList.length === 0 ? (
        <PCard className="py-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm font-medium" style={{ color: C.muted }}>Farzandlar bog'lanmagan</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Administrator bilan bog'laning</p>
        </PCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Davomat"        value={attendanceStats.present ?? 0}      icon={ClipboardCheck} description="Kelgan kunlar"     color="emerald" />
            <StatCard title="O'rtacha baho"  value={`${gradesData?.gpa ?? 0}%`}        icon={BookOpen}       description="Joriy daraja"      color="blue"    />
            <StatCard title="To'lovlar"      value={pending.length}                    icon={CreditCard}     description={pending.length > 0 ? 'Kutilayotgan' : "Hammasi to'langan"} color={pending.length > 0 ? 'red' : 'emerald'} />
          </div>

          {gpaTrend.length >= 3 && (
            <PCard>
              <p className="font-bold text-[15px] mb-1" style={{ color: C.text }}>Baho trendi</p>
              <p className="text-xs mb-5" style={{ color: C.muted }}>So'nggi {gpaTrend.length} ta bahoning dinamikasi</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={gpaTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Ball %']}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: C.shadow, fontSize: 12 }} />
                  <Line type="monotone" dataKey="pct" stroke="#2563EB" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </PCard>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {grades.length > 0 && (
              <PCard>
                <div className="flex items-center justify-between mb-5">
                  <p className="font-bold text-[15px]" style={{ color: C.text }}>So'nggi baholar</p>
                  <Link href="/dashboard/grades" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</Link>
                </div>
                <div className="space-y-2">
                  {grades.slice(0, 5).map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                      <div>
                        <p className="font-medium text-sm" style={{ color: C.text }}>{g.subject?.name}</p>
                        <p className="text-xs" style={{ color: C.muted }}>{new Date(g.date).toLocaleDateString('uz-UZ')}</p>
                      </div>
                      <Badge variant={(g.score / g.maxScore) >= 0.8 ? 'success' : (g.score / g.maxScore) >= 0.6 ? 'secondary' : 'destructive'}>
                        {g.score}/{g.maxScore}
                      </Badge>
                    </div>
                  ))}
                </div>
              </PCard>
            )}

            {nextExams.length > 0 && (
              <PCard>
                <p className="font-bold text-[15px] mb-5" style={{ color: C.text }}>Yaqin imtihonlar</p>
                <div className="space-y-2">
                  {nextExams.map((exam: any) => {
                    const d        = new Date(exam.scheduledAt);
                    const isToday  = d.toDateString() === new Date().toDateString();
                    const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
                    return (
                      <div key={exam.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                        <div>
                          <p className="font-medium text-sm" style={{ color: C.text }}>{exam.subject?.name}</p>
                          <p className="text-xs" style={{ color: C.muted }}>{exam.class?.name}</p>
                        </div>
                        <Badge variant={isToday ? 'destructive' : daysLeft <= 2 ? 'warning' : 'secondary'}>
                          {isToday ? 'Bugun' : daysLeft === 1 ? 'Ertaga' : `${daysLeft} kun`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </PCard>
            )}

            {pending.length > 0 && (
              <PCard>
                <p className="font-bold text-[15px] mb-5 text-xedu-ruby">Kutilayotgan to'lovlar</p>
                <div className="space-y-2">
                  {pending.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-[14px] border border-red-100 p-3">
                      <span className="text-sm" style={{ color: C.text }}>{p.description ?? "O'qish to'lovi"}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm" style={{ color: C.text }}>{formatCurrency(p.amount)}</span>
                        <Badge variant="destructive">{p.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </PCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Director Dashboard ─────────────────────────────────────────────────────────
