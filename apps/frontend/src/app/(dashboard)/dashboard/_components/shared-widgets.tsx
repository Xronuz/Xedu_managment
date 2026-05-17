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
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrency, getRoleLabel } from '@/lib/utils';

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

export const C = {
  primary:     'var(--xedu-primary)',
  primaryMid:  'var(--xedu-primary-hover)',
  primaryLight:'var(--xedu-primary-light)',
  text:        'var(--xedu-slate-900)',
  muted:       'var(--xedu-slate-500)',
  border:      'var(--xedu-slate-200)',
  bg:          'var(--xedu-slate-50)',
  card:        '#FFFFFF',
  shadow:      'var(--xedu-shadow-xs)',
} as const;

// ── Icon bubble color configs ─────────────────────────────────────────────────
export const ICON_CFG = {
  emerald: { bg: 'var(--xedu-primary-light)', icon: 'var(--xedu-primary)' },
  blue:    { bg: '#DBEAFE', icon: '#2563EB' },
  violet:  { bg: '#EDE9FE', icon: '#7C3AED' },
  amber:   { bg: '#FEF3C7', icon: '#D97706' },
  red:     { bg: '#FEE2E2', icon: '#DC2626' },
  indigo:  { bg: '#E0E7FF', icon: '#4338CA' },
  cyan:    { bg: '#CFFAFE', icon: '#0891B2' },
  rose:    { bg: '#FFE4E6', icon: '#E11D48' },
} as const;
type IconColor = keyof typeof ICON_CFG;

export const LEGACY_COLOR_MAP: Record<string, IconColor> = {
  'bg-blue-500':    'blue',
  'bg-violet-500':  'violet',
  'bg-purple-500':  'violet',
  'bg-xedu-primary':   'emerald',
  'bg-xedu-primary-light0': 'emerald',
  'bg-red-500':     'red',
  'bg-orange-500':  'amber',
  'bg-amber-500':   'amber',
  'bg-yellow-500':  'amber',
  'bg-cyan-500':    'cyan',
  'bg-sky-500':     'cyan',
  'bg-indigo-500':  'indigo',
  'bg-rose-500':    'rose',
  'bg-pink-500':    'rose',
  'bg-muted':       'blue',
  'bg-primary':     'emerald',
};

// ── Premium StatCard ───────────────────────────────────────────────────────────
export function StatCard({
  title, value, description, icon: Icon, trend, loading, color = 'blue', href, onClick,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  loading?: boolean;
  color?: IconColor | string;
  href?: string;
  onClick?: () => void;
}) {
  const resolvedColor = (LEGACY_COLOR_MAP[color] ?? color) as IconColor;
  const cfg = ICON_CFG[resolvedColor] ?? ICON_CFG.blue;
  const Wrapper = href ? Link : onClick ? 'button' : 'div';
  const wrapperProps = href ? { href } : onClick ? { onClick } : {};

  const isClickable = !!(href || onClick);

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'group relative block rounded-2xl border border-xedu-slate-100 bg-xedu-bg-elevated p-6 transition-all duration-[var(--xedu-duration)] dark:border-xedu-slate-800',
        isClickable && 'cursor-pointer hover:border-xedu-slate-200 hover:shadow-sm dark:hover:border-xedu-slate-700',
      )}
      style={{}}
    >
      {/* Arrow indicator — pastki o'ng burchak, icon bilan to'qnashmaydi */}
      {isClickable && (
        <ArrowUpRight className="absolute bottom-4 right-5 h-4 w-4 text-slate-300 opacity-50 group-hover:opacity-100 text-xedu-slate-300 opacity-0 transition-all duration-[var(--xedu-duration)] group-hover:opacity-100 group-hover:text-xedu-primary" />
      )}

      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>
          {title}
        </p>
        <div
          className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: cfg.bg }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: cfg.icon }} />
        </div>
      </div>

      {/* Value */}
      {loading
        ? <Skeleton className="h-10 w-28 mb-3 rounded-xl" />
        : (
          <p
            className="text-[38px] font-black leading-none tracking-tight mb-3"
            style={{ color: C.text }}
          >
            {value}
          </p>
        )
      }

      {/* Description */}
      {description && (
        <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: C.muted }}>
          {trend === 'up'   && <TrendingUp  className="h-3.5 w-3.5 text-xedu-primary shrink-0" />}
          {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />}
          {description}
        </p>
      )}
    </Wrapper>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-bold" style={{ color: C.text }}>{title}</h2>
      {action}
    </div>
  );
}

// ── Premium card wrapper ───────────────────────────────────────────────────────
export function PCard({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div
      className={cn('rounded-2xl border border-xedu-slate-100 bg-xedu-bg-elevated p-6 dark:border-xedu-slate-800', className)}
      style={{ ...style }}
    >
      {children}
    </div>
  );
}

// ── Today Schedule Widget ──────────────────────────────────────────────────────
export function TodayScheduleWidget() {
  const { activeBranchId } = useAuthStore();
  const { data: todaySlots, isLoading } = useQuery({
    queryKey: ['schedule', 'today', activeBranchId],
    queryFn: scheduleApi.getToday,
    staleTime: 10 * 60_000,
  });
  const slots: any[] = Array.isArray(todaySlots) ? todaySlots : [];

  return (
    <PCard className="h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-[15px]" style={{ color: C.text }}>Bugungi darslar</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          href="/dashboard/schedule"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          style={{ color: C.primary, background: C.primaryLight }}
        >
          Jadval <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Calendar className="h-8 w-8 opacity-20" />
          <p className="text-sm" style={{ color: C.muted }}>Bugun dars yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.slice(0, 6).map((slot: any) => (
            <div
              key={slot.id}
              className="flex items-center gap-3 rounded-[14px] border p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
              style={{ borderColor: C.border }}
            >
              <div
                className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ background: C.primaryLight, color: C.primary }}
              >
                {slot.timeSlot}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{slot.subject?.name}</p>
                <p className="text-xs truncate" style={{ color: C.muted }}>
                  {slot.class?.name}{slot.roomNumber ? ` · ${slot.roomNumber}-xona` : ''}
                </p>
              </div>
              <span className="text-xs shrink-0" style={{ color: C.muted }}>
                {slot.startTime}–{slot.endTime}
              </span>
            </div>
          ))}
        </div>
      )}
    </PCard>
  );
}

// ── Attendance Summary Widget ──────────────────────────────────────────────────
export function AttendanceSummaryWidget() {
  const { activeBranchId } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'today-summary', activeBranchId],
    queryFn: attendanceApi.getTodaySummary,
    refetchInterval: 60_000,
  });

  const pct = data?.presentPct ?? 0;
  const pctColor = pct >= 80 ? '#0F7B53' : pct >= 60 ? '#D97706' : '#DC2626';
  const barBg    = pct >= 80 ? C.primaryLight : pct >= 60 ? '#FEF3C7' : '#FEE2E2';
  const barFill  = pctColor;

  return (
    <PCard className="h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-[15px]" style={{ color: C.text }}>Bugungi davomat</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Maktab bo'yicha</p>
        </div>
        <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: C.primaryLight }}>
          <ClipboardCheck className="h-5 w-5" style={{ color: C.primary }} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <>
          {/* Big pct */}
          <p className="text-[52px] font-black leading-none tracking-tight mb-1" style={{ color: pctColor }}>
            {pct}%
          </p>
          <p className="text-sm mb-4" style={{ color: C.muted }}>
            Jami: {data?.marked ?? 0} / {data?.totalStudents ?? 0} o'quvchi
          </p>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full mb-5" style={{ background: barBg }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: barFill }}
            />
          </div>

          {/* 3 chips */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Keldi',    value: data?.present ?? 0, bg: '#DDF5EA', color: '#0F7B53' },
              { label: 'Kelmadi', value: data?.absent  ?? 0, bg: '#FEE2E2', color: '#DC2626' },
              { label: 'Kechikdi',value: data?.late    ?? 0, bg: '#FEF3C7', color: '#D97706' },
            ].map(s => (
              <div key={s.label} className="rounded-[14px] p-3 text-center" style={{ background: s.bg }}>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </PCard>
  );
}

// ── Upcoming Exams Widget ──────────────────────────────────────────────────────
export const FREQ_UZ: Record<string, string> = {
  weekly: 'Haftalik', monthly: 'Oylik', quarterly: 'Choraklik',
  midterm: 'Yarim yillik', final: 'Yakuniy', custom: 'Maxsus',
};

export function UpcomingExamsWidget() {
  const { activeBranchId } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['exams', 'upcoming', activeBranchId],
    queryFn: () => examsApi.getUpcoming(7),
  });
  const exams: any[] = Array.isArray(data) ? data : [];

  return (
    <PCard className="h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-[15px]" style={{ color: C.text }}>Yaqin imtihonlar</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Keyingi 7 kun</p>
        </div>
        <Link
          href="/dashboard/exams"
          className="text-xs font-semibold"
          style={{ color: C.primary }}
        >
          Barchasi →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <GraduationCap className="h-8 w-8 opacity-20" />
          <p className="text-sm text-center" style={{ color: C.muted }}>Yaqin imtihonlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exams.map((exam: any) => {
            const d = new Date(exam.scheduledAt);
            const isToday    = d.toDateString() === new Date().toDateString();
            const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
            const label = isToday ? 'Bugun' : isTomorrow ? 'Ertaga' : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
            const chipStyle = isToday
              ? { background: '#FEE2E2', color: '#DC2626' }
              : isTomorrow
              ? { background: '#FEF3C7', color: '#D97706' }
              : { background: '#EEF1F0', color: C.muted };

            return (
              <div
                key={exam.id}
                className="flex items-center justify-between rounded-[14px] border p-3"
                style={{ borderColor: C.border }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{exam.subject?.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>
                    {exam.class?.name} · {FREQ_UZ[exam.frequency] ?? exam.frequency}
                  </p>
                </div>
                <span
                  className="shrink-0 ml-3 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={chipStyle}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </PCard>
  );
}

// ── Class Teacher My Class ─────────────────────────────────────────────────────
export function ClassTeacherMyClassSection() {
  const router = useRouter();
  const { activeBranchId } = useAuthStore();

  const { data: myClass, isLoading } = useQuery({
    queryKey: ['classes', 'my-class', activeBranchId],
    queryFn: () => classesApi.getMyClass(),
  });

  const { data: gpaData } = useQuery({
    queryKey: ['grades', 'class-gpa', myClass?.id, activeBranchId],
    queryFn: () => gradesApi.getClassGpa(myClass!.id),
    enabled: !!myClass?.id,
  });

  if (isLoading) {
    return <div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-[22px]" />)}</div>;
  }

  if (!myClass) {
    return (
      <PCard>
        <p className="text-sm text-center" style={{ color: C.muted }}>
          Sizga hali sinf biriktirilmagan. Admin orqali sinf biriktiring.
        </p>
      </PCard>
    );
  }

  const studentCount = myClass._count?.students ?? 0;
  const classAvg     = gpaData?.classAvg ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[15px]" style={{ color: C.text }}>Mening sinfim — {myClass.name}</h2>
        <button
          onClick={() => router.push('/dashboard/my-class')}
          className="text-xs font-semibold flex items-center gap-1"
          style={{ color: C.primary }}
        >
          Batafsil <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "O'quvchilar", value: studentCount,           icon: ClipboardCheck, color: 'emerald', href: '/dashboard/attendance' },
          { label: "O'rtacha GPA",value: `${classAvg.toFixed(1)}%`,icon: BookOpen,    color: 'blue',    href: '/dashboard/grades'     },
          { label: "Sinf kodi",   value: myClass.gradeLevel||'—', icon: BookMarked,   color: 'violet',  href: '/dashboard/homework'   },
        ].map(item => (
          <StatCard
            key={item.label}
            title={item.label}
            value={item.value}
            icon={item.icon}
            color={item.color}
            onClick={() => router.push(item.href)}
          />
        ))}
      </div>

      {gpaData && gpaData.students.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.muted }}>Eng yuqori GPA</p>
            <div className="space-y-2">
              {gpaData.students.slice(0, 3).map((s: any, i: number) => (
                <div key={s.studentId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold"
                      style={i === 0 ? { background: '#FBBF24', color: '#fff' } : { background: C.border, color: C.muted }}
                    >{i + 1}</span>
                    <span style={{ color: C.text }}>{s.name}</span>
                  </span>
                  <span className="font-bold" style={{ color: C.primary }}>{s.gpa.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </PCard>
          <PCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.muted }}>Diqqat talab</p>
            <div className="space-y-2">
              {gpaData.students.slice(-3).reverse().filter((s: any) => s.gpa < 70).map((s: any) => (
                <div key={s.studentId} className="flex items-center justify-between text-sm">
                  <span style={{ color: C.text }}>{s.name}</span>
                  <span className="font-bold text-red-500">{s.gpa.toFixed(1)}%</span>
                </div>
              ))}
              {gpaData.students.filter((s: any) => s.gpa < 70).length === 0 && (
                <p className="text-sm text-center py-2" style={{ color: C.muted }}>Barcha o'quvchilar yaxshi!</p>
              )}
            </div>
          </PCard>
        </div>
      )}
    </div>
  );
}

// ── Teacher KPI Section ────────────────────────────────────────────────────────
export function TeacherKPISection() {
  const { user, activeBranchId } = useAuthStore();
  const router   = useRouter();

  const { data: todaySlots, isLoading: schedLoading } = useQuery({
    queryKey: ['schedule', 'today', activeBranchId],
    queryFn: scheduleApi.getToday,
    staleTime: 10 * 60_000,
  });

  const { data: homeworks = [] } = useQuery({
    queryKey: ['homework', activeBranchId],
    queryFn: () => homeworkApi.getAll(),
    staleTime: 5 * 60_000,
  });

  const myLessonsToday = (Array.isArray(todaySlots) ? todaySlots : [])
    .filter((s: any) => s.teacherId === user?.id).length;

  const hwList       = homeworks as any[];
  const pendingGrade = hwList.reduce((acc: number, hw: any) => {
    const subs = hw.submissions ?? [];
    return acc + subs.filter((s: any) => s.score === null || s.score === undefined).length;
  }, 0);

  const isClassTeacher = user?.role === 'class_teacher';
  const colors: IconColor[] = ['blue', 'emerald', 'amber', 'violet'];

  const teacherKpis = [
    ...(isClassTeacher ? [{ title: 'Mening sinfim', value: '→', icon: School,        description: "Sinf ro'yxati, davomat",    href: '/dashboard/my-class'  }] : []),
    { title: 'Bugun darslarim',       value: schedLoading ? '...' : myLessonsToday, icon: Calendar,       description: 'Bugungi dars soatlari', href: '/dashboard/schedule'  },
    { title: 'Baholanmagan',          value: pendingGrade,                           icon: ClipboardCheck, description: 'Kutayotgan topshiriqlar',href: '/dashboard/homework'  },
    { title: 'Jami uy vazifalari',    value: hwList.length,                          icon: BookMarked,     description: 'Berilgan vazifalar',     href: '/dashboard/homework'  },
  ];

  return (
    <div className={cn('grid gap-4', isClassTeacher ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
      {teacherKpis.map(({ title, value, icon, description, href }, i) => (
        <StatCard
          key={title}
          title={title}
          value={value}
          icon={icon}
          color={colors[i % colors.length]}
          description={description}
          onClick={() => router.push(href)}
        />
      ))}
    </div>
  );
}

// ── Vice Principal Section ─────────────────────────────────────────────────────
export function VicePrincipalSection() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { activeBranchId } = useAuthStore();
  const weekAgo      = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const today        = new Date().toISOString().slice(0, 10);

  const { data: leaveData }     = useQuery({ queryKey: ['leave-requests', 'pending', activeBranchId], queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }) });
  const { data: disciplineData }= useQuery({ queryKey: ['discipline', 'week', activeBranchId],        queryFn: () => disciplineApi.getAll({ from: weekAgo, to: today, limit: 50 }) });

  const pendingLeaves: any[]     = leaveData?.data ?? (Array.isArray(leaveData) ? leaveData : []);
  const disciplineList: any[]    = disciplineData?.data ?? [];
  const unresolvedDiscipline     = disciplineList.filter((d: any) => !d.resolved);

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => leaveRequestsApi.review(id, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const items = [
    { title: "Ta'til so'rovlari",   value: pendingLeaves.length,       desc: "Kutilayotgan so'rovlar",    icon: CalendarOff,  color: 'amber' as IconColor, href: '/dashboard/leave-requests', alert: pendingLeaves.length > 0 },
    { title: "Intizom hodisalari",  value: unresolvedDiscipline.length, desc: 'Hal qilinmagan (7 kun)',  icon: ShieldAlert,  color: 'red'   as IconColor, href: '/dashboard/discipline',     alert: unresolvedDiscipline.length > 0 },
    { title: "Ota-ona uchrashuvlari",value: '→',                        desc: "Uchrashuvlar jadvali",    icon: CalendarCheck,color: 'blue'  as IconColor, href: '/dashboard/meetings',       alert: false },
    { title: 'Ish yuklamasi',       value: '→',                        desc: "O'qituvchilar yuklamasi",  icon: Activity,     color: 'violet'as IconColor, href: '/dashboard/reports/workload',alert: false },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>O'rinbosar ko'rsatkichlari</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ title, value, desc, icon, color, href }) => (
          <StatCard key={title} title={title} value={value} icon={icon} color={color} description={desc} onClick={() => router.push(href)} />
        ))}
      </div>

      {pendingLeaves.length > 0 && (
        <PCard>
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-sm flex items-center gap-2" style={{ color: C.text }}>
              <CalendarOff className="h-4 w-4 text-amber-500" />
              Tezkor tasdiqlash — Ta&apos;til so&apos;rovlari
            </p>
            <button onClick={() => router.push('/dashboard/leave-requests')} className="text-xs font-semibold" style={{ color: C.primary }}>
              Barchasini ko&apos;rish →
            </button>
          </div>
          <div className="space-y-2">
            {pendingLeaves.slice(0, 5).map((leave: any) => {
              const name = `${leave.user?.firstName ?? ''} ${leave.user?.lastName ?? ''}`.trim() || 'Noma‘lum';
              const from = leave.startDate ? new Date(leave.startDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' }) : '—';
              const to   = leave.endDate   ? new Date(leave.endDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' }) : '—';
              return (
                <div key={leave.id} className="flex items-center gap-3 rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: C.text }}>{name}</p>
                    <p className="text-xs truncate" style={{ color: C.muted }}>{from} – {to} · {leave.reason?.slice(0, 30) ?? '—'}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold transition-colors"
                      style={{ background: C.primaryLight, color: C.primary }}
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ id: leave.id, action: 'approve' })}
                    >Tasdiqlash</button>
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold transition-colors"
                      style={{ background: '#FEE2E2', color: '#DC2626' }}
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ id: leave.id, action: 'reject' })}
                    >Rad</button>
                  </div>
                </div>
              );
            })}
            {pendingLeaves.length > 5 && (
              <p className="text-xs text-center pt-1" style={{ color: C.muted }}>+{pendingLeaves.length - 5} ta boshqa so&apos;rov</p>
            )}
          </div>
        </PCard>
      )}
    </div>
  );
}

// ── Admin Charts Section ───────────────────────────────────────────────────────
export const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export function AdminChartsSection() {
  const { activeBranchId } = useAuthStore();
  const now         = new Date();
  const sixMonthsAgo= new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

  const { data: paymentHistory, isLoading: payLoading } = useQuery({
    queryKey: ['payments', 'history', 'trend', activeBranchId],
    queryFn: () => paymentsApi.getHistory({ from: sixMonthsAgo, status: 'paid', limit: 500 }),
  });

  const { data: attendanceReport, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'report', 'trend', activeBranchId],
    queryFn: () => attendanceApi.getReport({
      startDate: new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    }),
  });

  const revenueData = (() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    const list: any[] = paymentHistory?.data ?? [];
    list.forEach((p: any) => {
      const key = (p.paidAt ?? p.createdAt ?? '').slice(0, 7);
      if (key in months) months[key] = (months[key] ?? 0) + (p.amount ?? 0);
    });
    return Object.entries(months).map(([key, val]) => {
      const [, mo] = key.split('-');
      return { month: MONTH_LABELS[parseInt(mo) - 1], amount: val };
    });
  })();

  const attendanceTrend = (() => {
    const records: any[] = Array.isArray(attendanceReport) ? attendanceReport : (attendanceReport?.data ?? []);
    const byDate: Record<string, { present: number; total: number }> = {};
    records.forEach((r: any) => {
      const d = r.date?.slice(0, 10) ?? '';
      if (!d) return;
      if (!byDate[d]) byDate[d] = { present: 0, total: 0 };
      byDate[d].total++;
      if (r.status === 'present') byDate[d].present++;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, v]) => ({
        day: new Date(date).toLocaleDateString('uz-UZ', { weekday: 'short' }),
        pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
      }));
  })();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Revenue bar chart */}
      <PCard>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-bold text-[15px]" style={{ color: C.text }}>Oylik daromad</p>
            <p className="text-sm mt-1 font-medium" style={{ color: C.muted }}>So&apos;nggi 6 oy (so&apos;m)</p>
          </div>
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: '#DBEAFE' }}>
            <BarChart2 className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        {payLoading ? <Skeleton className="h-52 rounded-2xl" /> : (
          <ResponsiveContainer width="100%" height={216}>
            <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Tushum']}
                contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }}
                cursor={{ fill: 'rgba(15,123,83,0.04)' }}
              />
              <defs>
                <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0F7B53" stopOpacity={1} />
                </linearGradient>
              </defs>
              <Bar dataKey="amount" fill="url(#revenueBarGrad)" radius={[10, 10, 3, 3]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </PCard>

      {/* Attendance trend */}
      <PCard>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-bold text-[15px]" style={{ color: C.text }}>Davomat trendi</p>
            <p className="text-sm mt-1 font-medium" style={{ color: C.muted }}>So&apos;nggi 7 kun (%)</p>
          </div>
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: C.primaryLight }}>
            <TrendingUp className="h-5 w-5" style={{ color: C.primary }} />
          </div>
        </div>
        {attLoading ? <Skeleton className="h-52 rounded-2xl" /> : attendanceTrend.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-sm" style={{ color: C.muted }}>Ma&apos;lumot yo&apos;q</div>
        ) : (
          <ResponsiveContainer width="100%" height={216}>
            <LineChart data={attendanceTrend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, 'Davomat']}
                contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }}
                cursor={{ stroke: 'rgba(15,123,83,0.1)', strokeWidth: 1 }}
              />
              <Line type="monotone" dataKey="pct" stroke={C.primary} strokeWidth={2.5}
                dot={{ r: 4, fill: '#fff', stroke: C.primary, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: C.primary, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </PCard>
    </div>
  );
}

// ── Quick action grid ──────────────────────────────────────────────────────────
export function QuickActions({ items }: { items: { label: string; href: string; icon: React.ElementType; iconColor: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(({ label, href, icon: Icon, iconColor }) => (
        <Link
          key={href + label}
          href={href}
          className="flex items-center gap-3 rounded-[16px] p-4 transition-all duration-150 hover:-translate-y-[1px]"
          style={{
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'rgba(0,0,0,0.01)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${iconColor}18` }}
          >
            <Icon className="h-4 w-4 shrink-0" style={{ color: iconColor }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: C.text }}>{label}</span>
        </Link>
      ))}
    </div>
  );
}

// ── Accountant Dashboard ───────────────────────────────────────────────────────
export const PIE_COLORS = [C.primary, '#EF4444', '#F59E0B'];

export function SuperAdminServiceStatus() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health-mini'],
    queryFn: async () => {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001'}/api/health`);
      const body = await r.json();
      return body.data ?? body;
    },
    refetchInterval: 30_000,
    retry: 1,
  });

  const getStatus = (key: string) => {
    if (isLoading) return 'loading';
    if (!health) return 'unknown';
    const info = health.info ?? {};
    return info[key]?.status === 'up' ? 'ok' : health.status === 'ok' ? 'ok' : 'error';
  };

  const rows = [
    { name: 'REST API Server', key: 'api',      detail: 'NestJS v10' },
    { name: 'PostgreSQL 16',   key: 'database', detail: 'Prisma ORM' },
    { name: 'Memory (Heap)',   key: 'memory_heap', detail: 'Max: 512 MB' },
    { name: 'Redis 7',         key: 'redis',    detail: 'BullMQ + Cache' },
  ];

  const labels: Record<string, string> = { ok: 'Ishlayapti', error: 'Xato', loading: '...', unknown: "Noma'lum" };
  const dot: Record<string, string> = {
    ok: 'bg-xedu-primary shadow-xedu-primary/30',
    error: 'bg-red-500 shadow-red-400/50',
    loading: 'bg-muted animate-pulse',
    unknown: 'bg-yellow-400',
  };
  const badge: Record<string, string> = {
    ok: 'bg-xedu-primary-light text-green-800',
    error: 'bg-red-100 text-red-800',
    loading: 'bg-muted text-xedu-slate-500 dark:text-xedu-slate-400',
    unknown: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-0">
      {rows.map(({ name, key, detail }) => {
        const s = getStatus(key);
        return (
          <div key={key} className="flex items-center justify-between py-2.5 border-b last:border-0">
            <div className="flex items-center gap-2.5">
              <div className={`h-2 w-2 rounded-full shadow-sm ${dot[s]}`} />
              <span className="text-xs font-medium">{name}</span>
              <span className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{detail}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge[s]}`}>
              {labels[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Academic Calendar Widget ───────────────────────────────────────────────────
export const AC_TYPES: { value: AcademicEventType; label: string; color: string }[] = [
  { value: 'holiday',       label: "Ta'til",             color: '#22c55e' },
  { value: 'exam_week',     label: 'Imtihon haftasi',    color: '#ef4444' },
  { value: 'quarter_start', label: 'Chorak boshlanishi', color: '#3b82f6' },
  { value: 'quarter_end',   label: 'Chorak tugashi',     color: '#8b5cf6' },
  { value: 'school_event',  label: 'Maktab tadbiri',     color: '#f59e0b' },
  { value: 'meeting',       label: "Yig'ilish",          color: '#06b6d4' },
  { value: 'other',         label: 'Boshqa',             color: '#94a3b8' },
];

export function AcademicCalendarWidget({ canEdit = false }: { canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState<CreateAcademicEventPayload>({
    title: '', type: 'holiday', startDate: '', endDate: '', color: '#22c55e',
  });

  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to   = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);

  const { data: eventsRaw, isLoading } = useQuery({
    queryKey: ['academic-calendar', 'widget', from, to],
    queryFn: () => academicCalendarApi.getAll({ from, to }),
    staleTime: 60_000,
  });
  const events: any[] = Array.isArray(eventsRaw) ? eventsRaw : (eventsRaw as any)?.data ?? [];
  const upcoming = [...events]
    .filter(e => new Date(e.endDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 6);

  const createMut = useMutation({
    mutationFn: () => academicCalendarApi.create(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-calendar'] }); setShowForm(false); resetForm(); toast({ title: 'Tadbir qo‘shildi' }); },
    onError: () => toast({ variant: 'destructive', title: 'Xato', description: 'Tadbir qo‘shishda xatolik' }),
  });
  const updateMut = useMutation({
    mutationFn: () => academicCalendarApi.update(editTarget?.id, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-calendar'] }); setShowForm(false); setEditTarget(null); toast({ title: 'Yangilandi' }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => academicCalendarApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-calendar'] }); toast({ title: ' O‘chirildi' }); },
  });

  const resetForm = () => setForm({ title: '', type: 'holiday', startDate: '', endDate: '', color: '#22c55e' });

  const openEdit = (ev: any) => {
    setEditTarget(ev);
    setForm({ title: ev.title, type: ev.type, startDate: ev.startDate?.slice(0,10), endDate: ev.endDate?.slice(0,10), color: ev.color ?? '#22c55e' });
    setShowForm(true);
  };

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate()} ${['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'][dt.getMonth()]}`;
  };

  return (
    <PCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="font-bold text-[14px]" style={{ color: C.text }}>Akademik Kalendar</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => { resetForm(); setEditTarget(null); setShowForm(true); }}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Qo'shish
            </button>
          )}
          <Link href="/dashboard/education?tab=academic-calendar" className="text-xs font-semibold" style={{ color: C.primary }}>
            Barchasi →
          </Link>
        </div>
      </div>

      {/* Quick add/edit form */}
      {showForm && canEdit && (
        <div className="mb-4 rounded-xl p-3 space-y-2.5 border" style={{ borderColor: C.border, background: C.bg }}>
          <input
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Tadbir nomi..."
            className="w-full text-sm px-3 py-1.5 rounded-lg border outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            style={{ borderColor: C.border }}
          />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className="text-xs px-2 py-1.5 rounded-lg border outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              style={{ borderColor: C.border }} />
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className="text-xs px-2 py-1.5 rounded-lg border outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              style={{ borderColor: C.border }} />
          </div>
          <select value={form.type} onChange={e => {
            const t = AC_TYPES.find(x => x.value === e.target.value);
            setForm(f => ({ ...f, type: e.target.value as AcademicEventType, color: t?.color ?? f.color }));
          }} className="w-full text-xs px-2 py-1.5 rounded-lg border outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            style={{ borderColor: C.border }}>
            {AC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditTarget(null); resetForm(); }}
              className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: C.border, color: C.muted }}>
              Bekor
            </button>
            <button
              onClick={() => editTarget ? updateMut.mutate() : createMut.mutate()}
              disabled={!form.title || !form.startDate || !form.endDate || createMut.isPending || updateMut.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50"
            >
              {editTarget ? 'Saqlash' : 'Qo‘shish'}
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
      ) : upcoming.length === 0 ? (
        <p className="text-center py-6 text-xs" style={{ color: C.muted }}>Yaqin tadbirlar yo'q</p>
      ) : (
        <div className="space-y-1.5">
          {upcoming.map((ev: any) => {
            const tc = AC_TYPES.find(t => t.value === ev.type);
            const color = ev.color ?? tc?.color ?? '#94a3b8';
            return (
              <div key={ev.id} className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: C.text }}>{ev.title}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{fmtDate(ev.startDate)}{ev.startDate !== ev.endDate ? ` – ${fmtDate(ev.endDate)}` : ''}</p>
                </div>
                {canEdit && (
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(ev)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => deleteMut.mutate(ev.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500">
                      <Trash2Icon className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PCard>
  );
}

