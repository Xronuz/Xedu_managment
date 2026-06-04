'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Users, GraduationCap, Calendar, ShieldAlert, ChevronDown, ChevronUp,
  Search, CreditCard, BookOpen, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { aiAnalyticsApi, type StudentRiskProfile, type RuleBreakdown } from '@/lib/api/ai-analytics';
import { cn } from '@/lib/utils';
import { AnalyticsSectionNav } from '@/components/analytics/analytics-section-nav';

// ── Risk config ────────────────────────────────────────────────────────────
const RISK_CFG = {
  LOW:      { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Past xavf',    ring: 'ring-emerald-200' },
  MEDIUM:   { bar: 'bg-amber-500',   badge: 'bg-amber-100   text-amber-700',   label: "O'rta xavf",   ring: 'ring-amber-200'   },
  HIGH:     { bar: 'bg-orange-500',  badge: 'bg-orange-100  text-orange-700',  label: 'Yuqori xavf',  ring: 'ring-orange-200'  },
  CRITICAL: { bar: 'bg-red-500',     badge: 'bg-red-100     text-red-700',     label: 'Kritik xavf',  ring: 'ring-red-200'     },
};

const TREND_EL = {
  IMPROVING: <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><TrendingUp className="h-3.5 w-3.5" />Yaxshilanmoqda</span>,
  STABLE:    <span className="flex items-center gap-1 text-slate-400 text-xs"><Minus className="h-3.5 w-3.5" />Barqaror</span>,
  DECLINING: <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><TrendingDown className="h-3.5 w-3.5" />Yomonlashmoqda</span>,
};

// ── Rule bar: har bir signal'ning hissasi ──────────────────────────────────
function RuleBar({
  label, score, maxScore, value, triggered, color,
}: {
  label: string; score: number; maxScore: number;
  value: string; triggered: boolean; color: string;
}) {
  if (!triggered && score === 0) return null;
  const pct = Math.round((score / maxScore) * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className={cn('font-medium', triggered ? 'text-xedu-slate-700 dark:text-xedu-slate-200' : 'text-xedu-slate-400')}>
          {label}
        </span>
        <span className={cn('font-mono tabular-nums', triggered ? 'text-xedu-slate-600 dark:text-xedu-slate-300' : 'text-xedu-slate-400')}>
          +{score} · {value}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', triggered ? color : 'bg-xedu-slate-200 dark:bg-xedu-slate-700')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Risk breakdown panel ───────────────────────────────────────────────────
function RiskBreakdownPanel({ breakdown }: { breakdown: RuleBreakdown }) {
  return (
    <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-slate-50/50 dark:bg-xedu-slate-900/30 p-3.5 space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-xedu-slate-400 mb-1">Risk tarkibi</p>
      <RuleBar
        label="Davomat"    score={breakdown.attendance.score} maxScore={30}
        value={`${breakdown.attendance.rate.toFixed(0)}%`}
        triggered={breakdown.attendance.triggered}  color="bg-orange-400"
      />
      <RuleBar
        label="GPA"        score={breakdown.gpa.score} maxScore={25}
        value={`${breakdown.gpa.value.toFixed(1)}/5`}
        triggered={breakdown.gpa.triggered}         color="bg-red-400"
      />
      <RuleBar
        label="GPA tushish" score={breakdown.gpaDrop.score} maxScore={15}
        value={`-${breakdown.gpaDrop.dropPct.toFixed(0)}%`}
        triggered={breakdown.gpaDrop.triggered}     color="bg-red-500"
      />
      <RuleBar
        label="To'lov qarzdorligi" score={breakdown.payment.score} maxScore={20}
        value={`${breakdown.payment.overdueMonths} oy`}
        triggered={breakdown.payment.triggered}     color="bg-amber-500"
      />
      <RuleBar
        label="Intizom"    score={breakdown.discipline.score} maxScore={15}
        value={`${breakdown.discipline.incidents} hodisa`}
        triggered={breakdown.discipline.triggered}  color="bg-purple-400"
      />
      <RuleBar
        label="Uy vazifasi" score={breakdown.homework.score} maxScore={10}
        value={`${breakdown.homework.completion.toFixed(0)}%`}
        triggered={breakdown.homework.triggered}    color="bg-sky-400"
      />
    </div>
  );
}

// ── Mini spark chart (weekly attendance trend) ─────────────────────────────
function AttendanceSpark({ trend }: { trend: StudentRiskProfile['weeklyTrend'] }) {
  const valid = trend.filter(t => t.attendanceRate >= 0).reverse(); // oldest first
  if (valid.length < 2) return null;
  const max = 100;
  const min = Math.max(0, Math.min(...valid.map(t => t.attendanceRate)) - 5);
  const range = max - min || 1;
  const W = 80; const H = 24;
  const pts = valid.map((t, i) => {
    const x = (i / (valid.length - 1)) * W;
    const y = H - ((t.attendanceRate - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  const lastVal = valid[valid.length - 1]?.attendanceRate ?? 0;
  const firstVal = valid[0]?.attendanceRate ?? 0;
  const isDecline = lastVal < firstVal - 2;
  return (
    <div className="flex items-center gap-2">
      <svg width={W} height={H} className="shrink-0">
        <polyline points={pts} fill="none" stroke={isDecline ? '#ef4444' : '#10b981'} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className={cn('text-[10px] font-mono', isDecline ? 'text-red-500' : 'text-emerald-600')}>
        {lastVal.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Student Card ───────────────────────────────────────────────────────────
function StudentCard({ student, expanded, onToggle }: {
  student: StudentRiskProfile; expanded: boolean; onToggle: () => void;
}) {
  const cfg = RISK_CFG[student.riskLevel];

  return (
    <Card className={cn('overflow-hidden transition-all', expanded && `ring-1 ${cfg.ring}`)}>
      <div className={cn('h-1', cfg.bar)} />
      <CardContent className="pt-4 pb-3 px-4">

        {/* ── Header row ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Score bubble */}
            <div className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black',
              cfg.badge,
            )}>
              {student.riskScore}
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 truncate mt-0.5">
                {student.className ?? "Sinf yo'q"}
                {student.branchName && ` · ${student.branchName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {student.consecutiveDecliningWeeks >= 2 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30 rounded-full px-2 py-0.5 border border-red-200 dark:border-red-800">
                <TrendingDown className="h-3 w-3" />
                {student.consecutiveDecliningWeeks} hafta↓
              </span>
            )}
            <Badge variant="outline" className={cn('text-[10px] font-semibold border-0', cfg.badge)}>
              {cfg.label}
            </Badge>
            <button
              onClick={onToggle}
              className="p-1 rounded-lg hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4 text-xedu-slate-400" /> : <ChevronDown className="h-4 w-4 text-xedu-slate-400" />}
            </button>
          </div>
        </div>

        {/* ── Quick stats (collapsed) ────────────────────────────────────── */}
        {!expanded && (
          <div className="mt-3 flex items-center gap-4 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />{student.attendanceRate.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />{student.gpa.toFixed(1)}/5
            </span>
            {student.ruleBreakdown.payment.triggered && (
              <span className="flex items-center gap-1 text-amber-600">
                <CreditCard className="h-3 w-3" />{student.ruleBreakdown.payment.overdueMonths}oy
              </span>
            )}
            {student.disciplineIncidents > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <ShieldAlert className="h-3 w-3" />{student.disciplineIncidents}
              </span>
            )}
            <div className="ml-auto">
              <AttendanceSpark trend={student.weeklyTrend} />
            </div>
          </div>
        )}

        {/* ── Expanded detail ────────────────────────────────────────────── */}
        {expanded && (
          <div className="mt-4 space-y-4 pt-3 border-t border-xedu-slate-100 dark:border-xedu-slate-800">

            {/* Metrics row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { icon: Calendar,     label: 'Davomat',     value: `${student.attendanceRate.toFixed(0)}%` },
                { icon: GraduationCap,label: 'GPA',         value: `${student.gpa.toFixed(1)}/5` },
                { icon: BookOpen,     label: 'Uy vazifasi', value: `${student.homeworkCompletion.toFixed(0)}%` },
                { icon: ShieldAlert,  label: 'Intizom',     value: `${student.disciplineIncidents}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-xedu-slate-50 dark:bg-xedu-slate-900/40 p-2 space-y-1">
                  <Icon className="h-3.5 w-3.5 mx-auto text-xedu-slate-400" />
                  <p className="text-[10px] text-xedu-slate-500">{label}</p>
                  <p className="text-sm font-bold">{value}</p>
                </div>
              ))}
            </div>

            {/* Baho trendi + ketma-ket pasayish */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                <span>Baho trendi:</span>
                {TREND_EL[student.lastGradeTrend]}
              </div>
              {student.consecutiveDecliningWeeks >= 2 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-full px-2.5 py-1 border border-red-200 dark:border-red-800">
                  <Activity className="h-3.5 w-3.5" />
                  Davomat {student.consecutiveDecliningWeeks} hafta ketma-ket pasaymoqda
                </span>
              )}
            </div>

            {/* Weekly trend spark */}
            {student.weeklyTrend.filter(t => t.attendanceRate >= 0).length >= 3 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-xedu-slate-400">8 haftalik davomat trendi</p>
                <div className="flex items-end gap-1 h-8">
                  {student.weeklyTrend.filter(t => t.attendanceRate >= 0).reverse().map((t, i) => {
                    const h = Math.max(4, Math.round((t.attendanceRate / 100) * 32));
                    const isLow = t.attendanceRate < 80;
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5 flex-1" title={`${t.week} hafta oldin: ${t.attendanceRate}%`}>
                        <div className={cn('w-full rounded-t-sm', isLow ? 'bg-red-400' : 'bg-emerald-400')} style={{ height: `${h}px` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-xedu-slate-400">
                  <span>8h oldin</span><span>Bu hafta</span>
                </div>
              </div>
            )}

            {/* Rule breakdown */}
            <RiskBreakdownPanel breakdown={student.ruleBreakdown} />

            {/* Recommendations */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-xedu-slate-400">Tavsiyalar</p>
              {student.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-xedu-slate-600 dark:text-xedu-slate-300 bg-xedu-slate-50 dark:bg-xedu-slate-900/40 rounded-lg px-3 py-2">
                  <span className="text-xedu-primary mt-0.5 shrink-0">→</span>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Triggered counts card ──────────────────────────────────────────────────
function TriggeredCard({ label, count, total, icon: Icon, color }: {
  label: string; count: number; total: number; icon: any; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-xedu-slate-50 dark:bg-xedu-slate-900/40 border border-xedu-slate-100 dark:border-xedu-slate-800">
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-xedu-slate-600 dark:text-xedu-slate-300 font-medium truncate">{label}</span>
          <span className="font-bold text-xedu-slate-800 dark:text-xedu-slate-100 shrink-0 ml-1">{count} ({pct}%)</span>
        </div>
        <div className="h-1.5 w-full bg-xedu-slate-200 dark:bg-xedu-slate-700 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full', color.replace('bg-', 'bg-').replace('/10', ''))} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['insights', 'dashboard'],
    queryFn:  aiAnalyticsApi.getDashboard,
    staleTime: 5 * 60_000,
  });

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['insights', 'students'],
    queryFn:  aiAnalyticsApi.getStudentProfiles,
    staleTime: 5 * 60_000,
  });

  const filtered = (profiles ?? []).filter(s => {
    const nameMatch = !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
    const levelMatch = filter === 'ALL' || s.riskLevel === filter;
    return nameMatch && levelMatch;
  });

  const total = dashboard?.totalStudents ?? 0;
  const dist  = dashboard?.riskDistribution;

  return (
    <div className="space-y-6">
      <AnalyticsSectionNav />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        </div>
        <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400 mt-1">
          Rule-based xavf baholash · Har o'quvchi uchun aniq sabab va tavsiya
        </p>
      </div>

      {/* Summary KPI cards */}
      {dashLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : dist && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Jami o\'quvchilar', value: total,          icon: Users,         color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800' },
            { label: 'Kritik xavf',       value: dist.critical,  icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/30' },
            { label: 'Yuqori xavf',       value: dist.high,      icon: TrendingDown,  color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-950/30' },
            { label: 'O\'rtacha davomat', value: `${dashboard?.averages.attendance ?? 0}%`, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{label}</p>
                    <p className={cn('text-2xl font-black mt-0.5', color)}>{value}</p>
                  </div>
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', bg)}>
                    <Icon className={cn('h-5 w-5', color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Risk distribution + triggered signals */}
      {dashboard && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Risk distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Risk taqsimoti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Kritik', count: dist!.critical, color: 'bg-red-500' },
                { label: 'Yuqori', count: dist!.high,     color: 'bg-orange-500' },
                { label: "O'rta",  count: dist!.medium,   color: 'bg-amber-500' },
                { label: 'Past',   count: dist!.low,      color: 'bg-emerald-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-xedu-slate-500 dark:text-xedu-slate-400">{label}</span>
                    <span className="font-semibold">{count} ({total > 0 ? Math.round(count / total * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', color)} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Triggered signals */}
          {dashboard.triggeredCounts && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Signal triggerlar</CardTitle>
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Nechta o'quvchida har signal ishlamoqda</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <TriggeredCard label="Davomat past"  count={dashboard.triggeredCounts.attendance} total={total} icon={Calendar}     color="bg-orange-100 dark:bg-orange-950/30 text-orange-600" />
                <TriggeredCard label="GPA past"       count={dashboard.triggeredCounts.gpa}        total={total} icon={GraduationCap} color="bg-red-100    dark:bg-red-950/30    text-red-600" />
                <TriggeredCard label="To'lov qarzdor" count={dashboard.triggeredCounts.payment}    total={total} icon={CreditCard}    color="bg-amber-100  dark:bg-amber-950/30  text-amber-600" />
                <TriggeredCard label="Intizom"        count={dashboard.triggeredCounts.discipline} total={total} icon={ShieldAlert}   color="bg-purple-100 dark:bg-purple-950/30 text-purple-600" />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filter + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-xedu-slate-400" />
          <Input placeholder="O'quvchi qidirish..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === lvl
                  ? 'bg-xedu-primary text-white'
                  : 'bg-xedu-slate-100 dark:bg-xedu-slate-800 text-xedu-slate-600 dark:text-xedu-slate-300 hover:bg-xedu-slate-200 dark:hover:bg-xedu-slate-700',
              )}
            >
              {lvl === 'ALL' ? 'Barchasi' : RISK_CFG[lvl].label}
              {lvl !== 'ALL' && dist && (
                <span className="ml-1 opacity-70">
                  ({lvl === 'CRITICAL' ? dist.critical : lvl === 'HIGH' ? dist.high : lvl === 'MEDIUM' ? dist.medium : dist.low})
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 ml-auto">{filtered.length} ta o'quvchi</p>
      </div>

      {/* Student list */}
      {profilesLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-xedu-slate-500 dark:text-xedu-slate-400 space-y-3">
          <Brain className="h-10 w-10 mx-auto text-slate-300" />
          <p className="font-medium">Ma'lumot topilmadi</p>
          <p className="text-xs">Filtr yoki qidiruvni o'zgartiring</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <StudentCard
              key={s.studentId}
              student={s}
              expanded={expandedId === s.studentId}
              onToggle={() => setExpandedId(expandedId === s.studentId ? null : s.studentId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
