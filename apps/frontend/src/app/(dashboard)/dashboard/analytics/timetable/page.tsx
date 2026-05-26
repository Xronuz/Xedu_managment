'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  Users, Building2, CalendarDays, UserCheck, DoorOpen,
  Activity, BrainCircuit, Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { BarChart2 } from 'lucide-react';
import { timetableAnalyticsApi } from '@/lib/api/timetable-analytics';
import { AnalyticsSectionNav } from '@/components/analytics/analytics-section-nav';
import { chartColorSequence } from '@/components/workspace-system/chart-palette';
import { StandardEmptyState } from '@/components/ui/standard-empty-state';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  underloaded: '#f59e0b',
  balanced: '#10b981',
  overloaded: '#ef4444',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Du', tuesday: 'Se', wednesday: 'Cho', thursday: 'Pa', friday: 'Ju', saturday: 'Sha', sunday: 'Ya',
};

// ─── Executive Card ──────────────────────────────────────────────────────────

function ExecCard({ icon, label, value, sub, tone = 'calm' }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'calm' | 'success' | 'attention' | 'urgent';
}) {
  const toneClasses = {
    calm: 'border-xedu-slate-200',
    success: 'border-green-200',
    attention: 'border-amber-200',
    urgent: 'border-red-200',
  };
  return (
    <Card className={`${toneClasses[tone]}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted text-xedu-slate-500">{icon}</div>
        <div>
          <p className="text-2xs text-xedu-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-lg font-bold">{value}</p>
          {sub && <p className="text-2xs text-xedu-slate-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TimetableAnalyticsPage() {
  const router = useRouter();
  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['timetable-analytics-overview'],
    queryFn: timetableAnalyticsApi.getOverview,
  });

  const { data: teacherUtil, isLoading: tuLoading } = useQuery({
    queryKey: ['timetable-analytics-teacher-util'],
    queryFn: timetableAnalyticsApi.getTeacherUtilization,
  });

  const { data: roomUtil, isLoading: ruLoading } = useQuery({
    queryKey: ['timetable-analytics-room-util'],
    queryFn: timetableAnalyticsApi.getRoomUtilization,
  });

  const { data: density, isLoading: dLoading } = useQuery({
    queryKey: ['timetable-analytics-density'],
    queryFn: timetableAnalyticsApi.getScheduleDensity,
  });

  const { data: absenceSub, isLoading: asLoading } = useQuery({
    queryKey: ['timetable-analytics-absence-sub'],
    queryFn: timetableAnalyticsApi.getAbsenceSubstitution,
  });

  const { data: solverQuality, isLoading: sqLoading } = useQuery({
    queryKey: ['timetable-analytics-solver'],
    queryFn: timetableAnalyticsApi.getSolverQuality,
  });

  const { data: payrollVar, isLoading: pvLoading } = useQuery({
    queryKey: ['timetable-analytics-payroll'],
    queryFn: timetableAnalyticsApi.getPayrollVariance,
  });

  // Derived chart data
  const teacherStatusData = useMemo(() => {
    if (!teacherUtil) return [];
    const grouped = { underloaded: 0, balanced: 0, overloaded: 0 };
    teacherUtil.forEach(t => grouped[t.status]++);
    return [
      { name: 'Past yuklama', value: grouped.underloaded, color: STATUS_COLORS.underloaded },
      { name: 'Muvozanat', value: grouped.balanced, color: STATUS_COLORS.balanced },
      { name: 'Oshiq yuklama', value: grouped.overloaded, color: STATUS_COLORS.overloaded },
    ];
  }, [teacherUtil]);

  const densityChartData = useMemo(() => {
    if (!density) return [];
    return density.map(d => ({
      name: `${DAY_LABELS[d.dayOfWeek] ?? d.dayOfWeek} ${d.timeSlot}`,
      Darslar: d.scheduleCount,
      Sinf: d.classCount,
      'O\'qituvchi': d.teacherCount,
    }));
  }, [density]);

  const absenceTrendData = useMemo(() => {
    if (!absenceSub?.weeklyTrend) return [];
    return absenceSub.weeklyTrend.map(w => ({
      name: w.weekStart.slice(5),
      Davomat: w.absences,
      Almashtirish: w.substitutions,
    }));
  }, [absenceSub]);

  const allLoaded = !ovLoading && !tuLoading && !ruLoading && !dLoading && !asLoading && !sqLoading && !pvLoading;
  const hasData = !!overview && (overview.totalPublishedSlots ?? 0) > 0;

  if (allLoaded && !hasData) {
    return (
      <div className="max-w-2xl mx-auto pt-10">
        <AnalyticsSectionNav />
        <StandardEmptyState
          icon={BarChart2}
          title="Jadval ma'lumotlari yetarli emas"
          description="Analitik hisobotlarni ko'rish uchun kamida bitta nashr etilgan dars jadvali kerak. Avval jadvalni tuzib, nashr eting."
          primaryAction={{
            label: 'Jadvalga o\'tish',
            onClick: () => router.push('/dashboard/schedule'),
          }}
          secondaryAction={{
            label: 'Maktabni sozlash',
            onClick: () => router.push('/dashboard/setup'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <AnalyticsSectionNav />

      <div>
        <h1 className="text-xl font-bold">Jadval operatsion analitikasi</h1>
        <p className="text-sm text-xedu-slate-500">Yuklama, bandlik, zichlik, davomat va sifat ko'rsatkichlari</p>
      </div>

      {/* ── Executive Overview ─────────────────────────────────────────────── */}
      {ovLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ExecCard icon={<Users className="h-4 w-4" />} label="O'qituvchilar" value={overview.teacherCount} sub={`${overview.avgTeacherUtilizationPct}% o'rtacha yuklama`} />
          <ExecCard icon={<DoorOpen className="h-4 w-4" />} label="Xonalar" value={overview.roomCount} sub={`${overview.avgRoomUtilizationPct}% o'rtacha bandlik`} />
          <ExecCard icon={<CalendarDays className="h-4 w-4" />} label="Jadval slotlari" value={overview.totalPublishedSlots} tone="calm" />
          <ExecCard icon={<Activity className="h-4 w-4" />} label="Davomat yo'qlik" value={`${overview.absenceRatePct}%`} tone={overview.absenceRatePct > 15 ? 'urgent' : 'success'} />
          <ExecCard icon={<UserCheck className="h-4 w-4" />} label="Almashtirish to'ldirish" value={`${overview.substitutionFillRatePct}%`} tone={overview.substitutionFillRatePct < 70 ? 'attention' : 'success'} />
          <ExecCard icon={<BrainCircuit className="h-4 w-4" />} label="Solver muvaffaqiyati" value={`${overview.solverSuccessRatePct}%`} tone="success" />
          <ExecCard icon={<Banknote className="h-4 w-4" />} label="Maosh variyatsiyasi" value={`${overview.payrollVarianceAvgPct}%`} tone={overview.payrollVarianceAvgPct > 20 ? 'attention' : 'calm'} />
          <ExecCard icon={<Building2 className="h-4 w-4" />} label="Sinflar" value={overview.totalClasses} tone="calm" />
        </div>
      ) : null}

      {/* ── Charts Row 1: Teacher & Room Utilization ───────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">O'qituvchi yuklamasi</CardTitle>
            <CardDescription className="text-xs">Rejada soat / shartnoma soati</CardDescription>
          </CardHeader>
          <CardContent>
            {tuLoading ? <Skeleton className="h-64" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={teacherUtil ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="teacherName" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="utilizationPct" name="Utilization %" fill={chartColorSequence[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">O'qituvchi status taqsimoti</CardTitle>
            <CardDescription className="text-xs">Past yuklama / Muvozanat / Oshiq yuklama</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {tuLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={teacherStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {teacherStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Room Utilization & Schedule Density ──────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Xona bandligi</CardTitle>
            <CardDescription className="text-xs">Band slotlar / Jami slotlar</CardDescription>
          </CardHeader>
          <CardContent>
            {ruLoading ? <Skeleton className="h-64" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={roomUtil ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="roomName" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="occupiedSlots" name="Band slotlar" fill={chartColorSequence[2]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalSlots" name="Jami slotlar" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jadval zichligi</CardTitle>
            <CardDescription className="text-xs">Kun va slot bo'yicha darslar soni</CardDescription>
          </CardHeader>
          <CardContent>
            {dLoading ? <Skeleton className="h-64" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={densityChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Darslar" fill={chartColorSequence[0]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 3: Absence/Substitution Trend & Solver Quality ──────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Davomat va almashtirish dinamikasi</CardTitle>
            <CardDescription className="text-xs">Haftalik yo'qlik va almashtirishlar</CardDescription>
          </CardHeader>
          <CardContent>
            {asLoading ? <Skeleton className="h-64" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={absenceTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Davomat" stroke={chartColorSequence[3]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Almashtirish" stroke={chartColorSequence[0]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solver sifat ko'rsatkichlari</CardTitle>
            <CardDescription className="text-xs">So'nggi 10 ta ishga tushirish</CardDescription>
          </CardHeader>
          <CardContent>
            {sqLoading ? <Skeleton className="h-64" /> : solverQuality ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded bg-muted">
                    <p className="text-lg font-bold">{solverQuality.successRatePct}%</p>
                    <p className="text-2xs text-xedu-slate-500">Muvaffaqiyat</p>
                  </div>
                  <div className="text-center p-2 rounded bg-muted">
                    <p className="text-lg font-bold">{solverQuality.avgPlacementPct}%</p>
                    <p className="text-2xs text-xedu-slate-500">Joylashish</p>
                  </div>
                  <div className="text-center p-2 rounded bg-muted">
                    <p className="text-lg font-bold">{solverQuality.bestScore ?? '—'}</p>
                    <p className="text-2xs text-xedu-slate-500">Eng yaxshi ball</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {solverQuality.recentRuns.slice(0, 5).map(run => (
                    <div key={run.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {run.strategy}
                        </Badge>
                        <span className="text-xedu-slate-500">{run.placedCount}/{run.demandsCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {run.score !== null && <span className="font-medium">{run.score} ball</span>}
                        <span className={`text-2xs ${run.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                          {run.status === 'completed' ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ── Payroll Variance Table ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Maosh variyatsiyasi</CardTitle>
          <CardDescription className="text-xs">Rejada soat vs bajarilgan soat (joriy oy)</CardDescription>
        </CardHeader>
        <CardContent>
          {pvLoading ? <Skeleton className="h-48" /> : payrollVar && payrollVar.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-xedu-slate-500">O'qituvchi</th>
                    <th className="text-right py-2 px-3 font-medium text-xedu-slate-500">Rejada</th>
                    <th className="text-right py-2 px-3 font-medium text-xedu-slate-500">Bajarilgan</th>
                    <th className="text-right py-2 px-3 font-medium text-xedu-slate-500">Farq</th>
                    <th className="text-right py-2 px-3 font-medium text-xedu-slate-500">%</th>
                    <th className="text-left py-2 px-3 font-medium text-xedu-slate-500">Manba</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollVar.map(p => (
                    <tr key={p.teacherId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{p.teacherName}</td>
                      <td className="text-right py-2 px-3">{p.scheduledHours}</td>
                      <td className="text-right py-2 px-3">{p.completedHours}</td>
                      <td className={`text-right py-2 px-3 font-medium ${p.varianceHours < 0 ? 'text-red-600' : p.varianceHours > 0 ? 'text-green-600' : ''}`}>
                        {p.varianceHours > 0 ? '+' : ''}{p.varianceHours}
                      </td>
                      <td className="text-right py-2 px-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          Math.abs(p.variancePct) > 20 ? 'bg-red-50 text-red-600' :
                          Math.abs(p.variancePct) > 10 ? 'bg-amber-50 text-amber-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {p.variancePct > 0 ? '+' : ''}{p.variancePct}%
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {p.source ?? 'noma\'lum'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-xedu-slate-500 text-center py-6">Joriy oy uchun maosh ma'lumotlari yo'q</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
