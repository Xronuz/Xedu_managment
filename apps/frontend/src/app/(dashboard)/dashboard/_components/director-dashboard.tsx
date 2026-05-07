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

export function DirectorDashboard() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { toast }    = useToast();
  const [annTitle,   setAnnTitle]  = useState('');
  const [annBody,    setAnnBody]   = useState('');
  const [annTarget,  setAnnTarget] = useState('all_staff');

  // School-wide queries — no branchId in cache key; backend returns school-level aggregation for DIRECTOR role
  const { data: attendanceSummary, isLoading: attLoading } = useQuery({ queryKey: ['attendance', 'today-summary', 'school-wide'],    queryFn: attendanceApi.getTodaySummary });
  const { data: classesData }  = useQuery({ queryKey: ['classes', 'school-wide'],              queryFn: classesApi.getAll });
  const { data: usersData }    = useQuery({ queryKey: ['users', 'all', 'school-wide'],          queryFn: () => usersApi.getAll({ limit: 200 }) });
  const { data: pendingLeaves }= useQuery({ queryKey: ['leave-requests', 'pending', 'school-wide'], queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }) });
  const { data: financeData }  = useQuery({ queryKey: ['finance', 'dashboard', 'school-wide'], queryFn: financeApi.getDashboard });
  const { data: pendingDiscipline } = useQuery({ queryKey: ['discipline', 'unresolved', 'school-wide'], queryFn: () => disciplineApi.getAll().catch(() => ({ data: [] })) });
  const { data: coinStats }  = useQuery({ queryKey: ['coins', 'admin', 'stats'],    queryFn: () => coinsApi.getStudentBalances().catch(() => ({ data: [] })), staleTime: 60_000 });
  const { data: kpiData }    = useQuery({ queryKey: ['kpi', 'dashboard', 'dir'],    queryFn: () => kpiApi.getDashboard().catch(() => ({ items: [] })),          staleTime: 60_000 });
  const { data: aiSummary }  = useQuery({ queryKey: ['ai-analytics', 'dashboard', 'dir'], queryFn: () => aiAnalyticsApi.getDashboard().catch(() => null),       staleTime: 60_000 });
  const { data: branches, isLoading: branchesLoading } = useQuery({ queryKey: ['branches', 'director'], queryFn: () => branchesApi.getAll().catch(() => []), staleTime: 60_000 });

  const classList: any[]         = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const allUsers: any[]          = (usersData as any)?.data ?? [];
  const teacherCount             = allUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length;
  const studentCount             = allUsers.filter((u: any) => u.role === 'student').length;
  const pendingLeaveList: any[]  = (pendingLeaves as any)?.data ?? pendingLeaves ?? [];
  const pendingDisciplineList: any[] = (pendingDiscipline as any)?.data ?? [];

  const presentPct    = (attendanceSummary as any)?.presentPct ?? 0;
  const totalStudents = (attendanceSummary as any)?.totalStudents ?? 0;

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => leaveRequestsApi.review(id, { action }),
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

  const dayLabel = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-black tracking-tight leading-none" style={{ color: C.text }}>
          Direktor paneli
        </h1>
        <p className="text-sm mt-2 font-medium" style={{ color: C.muted }}>
          Maktab umumiy holati &middot; {dayLabel}
        </p>
      </div>

      {/* KPI row — 4 asosiy stat */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Bugungi davomat" value={`${presentPct}%`}   description={`${totalStudents} ta o'quvchidan`} icon={ClipboardCheck} trend={presentPct >= 90 ? 'up' : 'down'} loading={attLoading} color="emerald" href="/dashboard/attendance" />
        <StatCard title="Sinflar soni"    value={classList.length}    description="Faol sinflar"                      icon={School}         color="blue"   href="/dashboard/education" />
        <StatCard title="O'qituvchilar"  value={teacherCount}        description="Faol xodimlar"                    icon={Users}          color="violet" href="/dashboard/staff" />
        <StatCard title="Oylik tushum"    value={formatCurrency((financeData as any)?.thisMonthRevenue ?? 0)} description="Joriy oy" icon={TrendingUp} color="amber" href="/dashboard/finance" />
      </div>

      {/* EduCoin + KPI + AI — 3 ta kengaytirilgan karta */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* EduCoin */}
        <StatCard title="EduCoin aylanma" value={((coinStats as any)?.data?.length ?? 0).toLocaleString()} description="Faol o'quvchilar" icon={Coins} color="amber" href="/dashboard/coins" />

        {/* KPI Summary */}
        <a href="/dashboard/kpi"
          className="group relative block rounded-2xl bg-white dark:bg-xedu-slate-900 p-6 shadow-sm dark:shadow-xedu-slate-900/30 transition-all duration-[var(--xedu-duration)] cursor-pointer hover:-translate-y-[2px] hover:shadow-sm"
        >
          <ArrowUpRight className="absolute bottom-4 right-5 h-4 w-4 text-xedu-slate-300 opacity-50 group-hover:opacity-100 group-hover:text-xedu-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-[var(--xedu-duration)]" />
          <div className="flex items-start justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>KPI bo'yicha</p>
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: ICON_CFG.violet.bg }}>
              <BarChart2 className="h-[18px] w-[18px]" style={{ color: ICON_CFG.violet.icon }} />
            </div>
          </div>
          {(() => {
            const items: any[] = (kpiData as any)?.items ?? [];
            const avg = items.length ? Math.round(items.reduce((s: number, i: any) => s + (i.progress ?? 0), 0) / items.length) : 0;
            return (
              <>
                <p className="text-[38px] font-black leading-none tracking-tight mb-3" style={{ color: C.text }}>{avg}%</p>
                <p className="text-[12px] font-medium" style={{ color: C.muted }}>{items.length} ta metrika · o'rtacha bajarilish</p>
              </>
            );
          })()}
        </a>

        {/* AI Analytics */}
        <a href="/dashboard/ai-analytics"
          className="group relative block rounded-2xl bg-white dark:bg-xedu-slate-900 p-6 shadow-sm dark:shadow-xedu-slate-900/30 transition-all duration-[var(--xedu-duration)] cursor-pointer hover:-translate-y-[2px] hover:shadow-sm"
        >
          <ArrowUpRight className="absolute bottom-4 right-5 h-4 w-4 text-xedu-slate-300 opacity-50 group-hover:opacity-100 group-hover:text-xedu-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-[var(--xedu-duration)]" />
          <div className="flex items-start justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>AI Tahlil</p>
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: ICON_CFG.emerald.bg }}>
              <Activity className="h-[18px] w-[18px]" style={{ color: ICON_CFG.emerald.icon }} />
            </div>
          </div>
          {(() => {
            const ai: any = aiSummary;
            const atRisk = (ai?.riskDistribution?.critical ?? 0) + (ai?.riskDistribution?.high ?? 0);
            const total  = ai?.totalStudents ?? 0;
            return (
              <>
                <p className="text-[38px] font-black leading-none tracking-tight mb-3" style={{ color: atRisk > 0 ? 'var(--xedu-red)' : C.text }}>{atRisk}</p>
                <p className="text-[12px] font-medium" style={{ color: C.muted }}>
                  {total > 0 ? `${total} ta o'quvchidan xavf ostida` : "O'quvchilar tahlili"}
                </p>
              </>
            );
          })()}
        </a>
      </div>

      {/* ── Filiallar + Akademik Kalendar (2 kolonna) ── */}
      <div className="grid gap-4 md:grid-cols-2">
      <PCard>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-[15px]" style={{ color: C.text }}>Filiallar bo'yicha statistika</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>Barcha filiallar umumiy holati</p>
          </div>
          <a href="/dashboard/branches" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</a>
        </div>
        {branchesLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: C.border }}>
                  <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>Filial</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>O'quvchilar</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>O'qituvchilar</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>Xodimlar</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>Holati</th>
                </tr>
              </thead>
              <tbody>
                {((branches as any[]) ?? []).map((branch: any) => {
                  const branchUsers = allUsers.filter((u: any) => u.branchId === branch.id);
                  const bStudents   = branchUsers.filter((u: any) => u.role === 'student').length;
                  const bTeachers   = branchUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length;
                  const bStaff      = branchUsers.filter((u: any) => !['student', 'teacher', 'class_teacher', 'parent'].includes(u.role)).length;
                  return (
                    <tr key={branch.id} className="border-b last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors" style={{ borderColor: C.border }}>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[13px]" style={{ color: C.text }}>{branch.name}</p>
                        {branch.address && <p className="text-[11px] mt-0.5 truncate max-w-[200px]" style={{ color: C.muted }}>{branch.address}</p>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[13px] font-bold" style={{ color: C.text }}>{bStudents}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[13px] font-bold" style={{ color: C.text }}>{bTeachers}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[13px] font-bold" style={{ color: C.text }}>{bStaff}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${branch.isActive ? 'bg-xedu-primary-light text-xedu-primary' : 'bg-red-50 text-red-600'}`}>
                          {branch.isActive ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!branches || (branches as any[]).length === 0) && (
                  <tr><td colSpan={5} className="py-10 text-center">
                    <p className="text-sm font-medium" style={{ color: C.muted }}>Filiallar mavjud emas</p>
                    <p className="text-xs mt-1" style={{ color: C.muted }}>Yangi filial qo&apos;shish orqali boshlang</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PCard>

      {/* Akademik Kalendar widget — direktor CRUD bilan */}
      <AcademicCalendarWidget canEdit={true} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leave approval */}
        <PCard>
          <div className="flex items-center justify-between mb-5">
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
              <div className="flex flex-col items-center py-8 gap-2">
                <CheckCircle2 className="h-7 w-7 text-xedu-primary" />
                <p className="text-sm font-medium" style={{ color: C.muted }}>Kutilayotgan so'rovlar yo'q</p>
              </div>
            ) : (
              pendingLeaveList.slice(0, 8).map((req: any) => (
                <div key={req.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                      {req.requester?.firstName} {req.requester?.lastName}
                    </p>
                    <p className="text-xs truncate" style={{ color: C.muted }}>
                      {new Date(req.startDate).toLocaleDateString('uz-UZ')} – {new Date(req.endDate).toLocaleDateString('uz-UZ')}
                      {req.reason ? ` · ${req.reason.slice(0, 25)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold"
                      style={{ background: C.primaryLight, color: C.primary }}
                      onClick={() => reviewMutation.mutate({ id: req.id, action: 'approve' })}
                      disabled={reviewMutation.isPending}
                    ></button>
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold"
                      style={{ background: '#FEE2E2', color: '#DC2626' }}
                      onClick={() => reviewMutation.mutate({ id: req.id, action: 'reject' })}
                      disabled={reviewMutation.isPending}
                    ></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </PCard>

        {/* Broadcast */}
        <PCard>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: ICON_CFG.blue.bg }}>
              <Bell className="h-4.5 w-4.5" style={{ color: ICON_CFG.blue.icon }} />
            </div>
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>E'lon yuborish</p>
              <p className="text-xs" style={{ color: C.muted }}>Toplu xabar yuborish</p>
            </div>
          </div>
          <div className="space-y-3">
            <Select value={annTarget} onValueChange={setAnnTarget}>
              <SelectTrigger className="h-10 text-sm rounded-[14px]"><SelectValue /></SelectTrigger>
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
              className="w-full rounded-[14px] border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
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
              rows={3}
            />
            <Button
              className="w-full"
              onClick={handleBroadcast}
              disabled={!annTitle.trim() || !annBody.trim() || broadcastMutation.isPending}
            >
              {broadcastMutation.isPending ? 'Yuborilmoqda...' : broadcastMutation.isSuccess ? ' Yuborildi' : "📢 E'lon yuborish"}
            </Button>
          </div>
        </PCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {pendingDisciplineList.length > 0 && (
          <PCard>
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
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

        <PCard>
          <p className="font-bold text-[15px] mb-5" style={{ color: C.text }}>Tezkor havolalar</p>
          <QuickActions items={[
            { label: 'Davomat hisoboti', href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary  },
            { label: 'Baholar',          href: '/dashboard/grades',     icon: BarChart2,      iconColor: '#2563EB'  },
            { label: 'Moliya xulosasi',  href: '/dashboard/finance',    icon: TrendingUp,     iconColor: '#D97706'  },
            { label: 'Dars jadvali',     href: '/dashboard/schedule',   icon: Calendar,       iconColor: '#7C3AED'  },
            { label: 'Xodimlar',         href: '/dashboard/staff',      icon: Users,          iconColor: C.muted    },
            { label: 'Hisobotlar',       href: '/dashboard/reports',    icon: BarChart2,      iconColor: '#4338CA'  },
          ]} />
        </PCard>
      </div>

    </div>
  );
}

// ── Student redirect ───────────────────────────────────────────────────────────
