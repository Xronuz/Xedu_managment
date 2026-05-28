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
  CalendarDays, Plus, Pencil, Trash2 as Trash2Icon, Loader2,
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
import { demoRequestsApi, type DemoRequest, type DemoRequestStatus } from '@/lib/api/super-admin';
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

import { Input } from '@/components/ui/input';

import {
  C, ICON_CFG, LEGACY_COLOR_MAP, StatCard, PCard, SectionHeader, QuickActions,
  TodayScheduleWidget, AttendanceSummaryWidget,
  UpcomingExamsWidget, ClassTeacherMyClassSection, TeacherKPISection,
  VicePrincipalSection, AdminChartsSection, AcademicCalendarWidget,
  SuperAdminServiceStatus, MONTH_LABELS, PIE_COLORS, FREQ_UZ
} from './shared-widgets';

export function SuperAdminDashboard() {
  const { data: stats, isLoading }          = useQuery({ queryKey: ['super-admin', 'stats'],   queryFn: superAdminApi.getStats });
  const { data: schools, isLoading: schoolsLoading } = useQuery({ queryKey: ['super-admin', 'schools'], queryFn: () => superAdminApi.getSchools({ limit: 5 }) });

  return (
    <div className="space-y-6">
      <DemoRequestsPanel />

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

// ── Demo Requests Panel ───────────────────────────────────────────────────────

const STATUS_LABELS: Record<DemoRequestStatus, string> = {
  new: 'Yangi', contacted: 'Bog\'lashildi', scheduled: 'Rejalashtirildi',
  completed: 'Tugallandi', rejected: 'Rad etildi',
};
const STATUS_COLORS: Record<DemoRequestStatus, string> = {
  new: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  contacted: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  scheduled: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  rejected:  'bg-red-500/15 text-red-500',
};

function DemoRequestsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<DemoRequestStatus | 'all'>('all');
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['demo-requests', statusFilter],
    queryFn: () => demoRequestsApi.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 50,
    }),
    refetchInterval: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['demo-requests', 'stats'],
    queryFn: demoRequestsApi.getStats,
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status?: DemoRequestStatus; notes?: string } }) =>
      demoRequestsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demo-requests'] });
      toast({ variant: 'success', title: 'Yangilandi' });
      setSelected(null);
    },
  });

  const requests = data?.data ?? [];
  const s = statsData?.data ?? {} as Record<DemoRequestStatus, number>;
  const newCount = s.new ?? 0;

  return (
    <PCard className="p-5">
      {/* header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: C.bg }}>
            <Rocket className="h-4 w-4" style={{ color: C.primary }} />
          </div>
          <div>
            <p className="font-bold text-[14px] flex items-center gap-2" style={{ color: C.text }}>
              Demo So'rovlar
              {newCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                  {newCount}
                </span>
              )}
            </p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              Jami: {data?.meta?.total ?? 0} so'rov
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'new', 'contacted', 'scheduled', 'completed', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition border ${
                statusFilter === st
                  ? 'border-xedu-primary bg-xedu-primary text-white'
                  : 'border-transparent hover:border-xedu-border'
              }`}
              style={{ color: statusFilter === st ? undefined : C.muted }}
            >
              {st === 'all' ? 'Barchasi' : STATUS_LABELS[st]}
              {st !== 'all' && s[st] ? ` (${s[st]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : requests.length === 0 ? (
        <div className="py-10 text-center">
          <Rocket className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm" style={{ color: C.muted }}>So'rovlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div
              key={r.id}
              onClick={() => { setSelected(r); setNotes(r.notes ?? ''); }}
              className="flex items-center justify-between rounded-xl border p-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              style={{ borderColor: C.border }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-white"
                  style={{ background: C.primary }}>
                  {r.firstName[0]}{r.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] truncate" style={{ color: C.text }}>
                    {r.firstName} {r.lastName}
                  </p>
                  <p className="text-xs truncate" style={{ color: C.muted }}>{r.institution} · {r.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
                <span className="text-[10px]" style={{ color: C.muted }}>
                  {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                </span>
                <ChevronRight className="h-3.5 w-3.5" style={{ color: C.muted }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-[16px]" style={{ color: C.text }}>
                  {selected.firstName} {selected.lastName}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: C.muted }}>{selected.institution}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X className="h-4 w-4" style={{ color: C.muted }} />
              </button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              {[
                ['Email', selected.email],
                ['Telefon', selected.phone],
                ['Sana', new Date(selected.createdAt).toLocaleString('uz-UZ')],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="font-medium w-20 shrink-0" style={{ color: C.muted }}>{label}</span>
                  <span style={{ color: C.text }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-1 block" style={{ color: C.muted }}>Izoh</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Izoh qoldiring..."
                className="text-sm resize-none"
                rows={2}
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-1 block" style={{ color: C.muted }}>Status</label>
              <Select
                value={selected.status}
                onValueChange={(val) =>
                  updateMutation.mutate({ id: selected.id, payload: { status: val as DemoRequestStatus, notes } })
                }
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as DemoRequestStatus[]).map((st) => (
                    <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => updateMutation.mutate({ id: selected.id, payload: { notes } })}
              disabled={updateMutation.isPending}
              className="w-full h-9 rounded-xl text-sm font-semibold text-white transition flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ background: C.primary }}
            >
              {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Saqlash
            </button>
          </div>
        </div>
      )}
    </PCard>
  );
}

// ── Librarian Dashboard ────────────────────────────────────────────────────────
