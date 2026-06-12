'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Target, TrendingUp, Plus, BarChart3, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, Loader2, Zap, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { kpiApi, type KpiDashboardItem, type KpiBranchComparison } from '@/lib/api/kpi';
import { cn } from '@/lib/utils';
import { AnalyticsSectionNav } from '@/components/analytics/analytics-section-nav';

/** Filiallar solishtiruvida eng yaxshi/yomon qiymatni aniqlash (yo'nalishga mos) */
function bestWorst(values: (number | null)[], direction: string) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return { best: null as number | null, worst: null as number | null };
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  if (max === min) return { best: null, worst: null };
  return direction === 'LOWER_IS_BETTER' ? { best: min, worst: max } : { best: max, worst: min };
}

const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

function BranchComparisonSection({ data }: { data: KpiBranchComparison }) {
  const start = new Date(data.periodStart);
  const periodLabel = `${UZ_MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-xedu-primary" />
          Filiallar solishtiruvi
        </CardTitle>
        <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
          {periodLabel} — tizim metrikalari filiallar kesimida (jonli hisob)
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left pb-2 pr-4">Metrika</th>
              {data.branches.map((b) => (
                <th key={b.id} className="text-right pb-2 px-3 whitespace-nowrap">{b.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const { best, worst } = bestWorst(data.branches.map((b) => row.values[b.id]), row.direction);
              return (
                <tr key={row.metricId} className="border-t border-xedu-border">
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{row.name}</span>
                    {row.direction === 'LOWER_IS_BETTER' && (
                      <span className="ml-1.5 text-[10px] text-xedu-slate-500 dark:text-xedu-slate-400">(kam = yaxshi)</span>
                    )}
                  </td>
                  {data.branches.map((b) => {
                    const v = row.values[b.id];
                    return (
                      <td
                        key={b.id}
                        className={cn(
                          'py-2.5 px-3 text-right tabular-nums whitespace-nowrap',
                          v === null ? 'text-xedu-slate-400' :
                          v === best ? 'font-semibold text-xedu-primary' :
                          v === worst ? 'font-semibold text-xedu-ruby-600' : '',
                        )}
                      >
                        {v !== null ? `${v.toLocaleString()}${row.unit === '%' ? '%' : ` ${row.unit}`}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  STRATEGY:   { label: 'Strategiya', color: 'bg-blue-100 text-blue-700' },
  ACADEMIC:   { label: "Akademik", color: 'bg-xedu-primary-light text-xedu-primary' },
  TEACHER:    { label: "O'qituvchi", color: 'bg-violet-100 text-violet-700' },
  STUDENT:    { label: "O'quvchi", color: 'bg-amber-100 text-amber-700' },
  MARKETING:  { label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  FINANCE:    { label: 'Moliya', color: 'bg-green-100 text-green-700' },
  OPERATIONS: { label: 'Operatsiya', color: 'bg-cyan-100 text-cyan-700' },
  AI_IT:      { label: 'AI & IT', color: 'bg-indigo-100 text-indigo-700' },
  BRANDING:   { label: 'Brending', color: 'bg-rose-100 text-rose-700' },
  MONITORING: { label: 'Monitoring', color: 'bg-slate-100 text-slate-700' },
};

/** Mini sparkline — oxirgi 6 davr trendi */
function Sparkline({ values, status }: { values: number[]; status: string | null }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 72, h = 22;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          status === 'good' ? 'stroke-xedu-primary' :
          status === 'warn' ? 'stroke-xedu-amber-500' : 'stroke-xedu-ruby-500',
        )}
      />
    </svg>
  );
}

function KpiCard({ item, onOpen }: { item: KpiDashboardItem; onOpen: () => void }) {
  const progress = item.progress;
  const status = item.status; // backend yo'nalishni hisobga olib beradi
  const noData = item.latestValue === null;
  const lowerIsBetter = item.direction === 'LOWER_IS_BETTER';

  return (
    <Card
      onClick={onOpen}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className="hover:shadow-sm transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary/40"
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
              {item.sourceType === 'SYSTEM' && (
                <span
                  title="Tizim ma'lumotidan avtomatik hisoblanadi"
                  className="inline-flex items-center gap-0.5 rounded-md bg-xedu-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-xedu-violet-600"
                >
                  <Zap className="h-2.5 w-2.5" /> AUTO
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn('text-[10px] font-medium', CATEGORY_LABELS[item.category]?.color)}>
                {CATEGORY_LABELS[item.category]?.label ?? item.category}
              </Badge>
              <span className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                {!lowerIsBetter && item.targetValue <= 0
                  ? 'Kuzatuv (maqsadsiz)'
                  : `Maqsad: ${lowerIsBetter ? '≤ ' : ''}${item.targetValue.toLocaleString()}${item.unit}`}
              </span>
            </div>
          </div>
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            noData || !status ? 'bg-xedu-slate-100 dark:bg-xedu-slate-800' :
            status === 'good' ? 'bg-xedu-primary-light dark:bg-xedu-emerald-100' :
            status === 'warn' ? 'bg-xedu-amber-100' : 'bg-xedu-ruby-100',
          )}>
            {noData || !status ? <Minus className="h-4 w-4 text-xedu-slate-400" /> :
             status === 'good' ? <ArrowUpRight className="h-4 w-4 text-xedu-primary" /> :
             status === 'warn' ? <Minus className="h-4 w-4 text-xedu-amber-600" /> :
             <ArrowDownRight className="h-4 w-4 text-xedu-ruby-600" />}
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 mb-2">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {item.latestValue !== null ? item.latestValue.toLocaleString() : '—'}
            </span>
            <span className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">{item.unit}</span>
          </div>
          <Sparkline values={item.trend ?? []} status={status} />
        </div>

        {item.awaitingValue && (
          <p className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-xedu-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-xedu-amber-700">
            O&apos;tgan oy qiymati kutilmoqda{item.owner ? ` — ${item.owner.name}` : ''}
          </p>
        )}
        {noData ? (
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
            {item.sourceType === 'SYSTEM' ? "Hali snapshot olinmagan" : "Hali qiymat kiritilmagan"}
          </p>
        ) : progress === null ? (
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
            Maqsad belgilanmagan — faqat kuzatiladi
          </p>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-xedu-slate-500 dark:text-xedu-slate-400">Bajarilish</span>
              <span className={cn(
                'font-semibold',
                status === 'good' ? 'text-xedu-primary' : status === 'warn' ? 'text-xedu-amber-600' : 'text-xedu-ruby-600',
              )}>
                {progress}%
              </span>
            </div>
            <Progress
              value={Math.min(progress ?? 0, 100)}
              className={cn(
                'h-2',
                status === 'good' ? '[&>div]:bg-xedu-primary' : status === 'warn' ? '[&>div]:bg-xedu-amber-500' : '[&>div]:bg-xedu-ruby-500',
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  );
}

export default function KpiDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const canManage = ['vice_principal', 'super_admin'].includes(user?.role ?? '');
  const canSnapshot = ['vice_principal', 'director', 'super_admin'].includes(user?.role ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['kpi', 'dashboard'],
    queryFn: () => kpiApi.getDashboard(),
    staleTime: 60_000,
  });

  const snapshotMutation = useMutation({
    mutationFn: () => kpiApi.runSnapshot(),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
      toast({
        title: 'Snapshot tayyor',
        description: `${r.written} ta metrika hisoblandi${r.skipped ? `, ${r.skipped} tasida davr uchun ma'lumot yo'q` : ''}.`,
      });
    },
    onError: () => toast({ title: 'Xatolik', description: 'Snapshot olishda muammo.', variant: 'destructive' }),
  });

  const hasSystemMetrics = (data?.metrics ?? []).some(m => m.sourceType === 'SYSTEM');
  const categories = data?.byCategory ? Object.entries(data.byCategory) : [];

  // Filiallar solishtiruvi — faqat tizim metrikalari borida
  const { data: comparison } = useQuery({
    queryKey: ['kpi', 'branch-comparison'],
    queryFn: () => kpiApi.getBranchComparison(),
    staleTime: 5 * 60_000,
    enabled: hasSystemMetrics,
  });
  const showComparison = (comparison?.branches?.length ?? 0) >= 2 && (comparison?.rows?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <AnalyticsSectionNav />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1>
          <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400 mt-1">
            Kalit ko'rsatkichlar va monitoring tizimi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canSnapshot && hasSystemMetrics && (
            <Button
              variant="outline"
              disabled={snapshotMutation.isPending}
              onClick={() => snapshotMutation.mutate()}
              title="O'tgan oy uchun tizim metrikalarini qayta hisoblash"
            >
              {snapshotMutation.isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <RefreshCw className="h-4 w-4 mr-2" />}
              Snapshot olish
            </Button>
          )}
          {canManage && (
            <Button onClick={() => router.push('/dashboard/kpi/metrics/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Yangi KPI
            </Button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {!isLoading && data?.metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">Umumiy indeks</p>
              <div className="flex items-end gap-2">
                <p className={cn(
                  'text-2xl font-bold',
                  data.overallScore === null ? '' :
                  data.overallScore >= 85 ? 'text-xedu-primary' :
                  data.overallScore >= 70 ? 'text-xedu-amber-600' : 'text-xedu-ruby-600',
                )}>
                  {data.overallScore !== null ? `${data.overallScore}%` : '—'}
                </p>
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">{data.metrics.length} KPI</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">Maqsadga yetgan</p>
              <p className="text-2xl font-bold text-xedu-primary">
                {data.metrics.filter(m => m.status === 'good').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">Ogohlantirish</p>
              <p className="text-2xl font-bold text-xedu-amber-600">
                {data.metrics.filter(m => m.status === 'warn').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">Muammoli</p>
              <p className="text-2xl font-bold text-xedu-ruby-600">
                {data.metrics.filter(m => m.status === 'bad').length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filiallar solishtiruvi */}
      {showComparison && comparison && <BranchComparisonSection data={comparison} />}

      {/* Categories */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">KPI metrikalar yo'q</h3>
          <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400 max-w-sm mt-1">
            Hozircha hech qanday KPI metrika kiritilmagan. Yangi metrika qo'shishni boshlang.
          </p>
          {canManage && (
            <Button className="mt-4" onClick={() => router.push('/dashboard/kpi/metrics/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Yangi KPI qo'shish
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  {CATEGORY_LABELS[category]?.label ?? category}
                </h2>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item: any) => (
                  <KpiCard
                    key={item.metricId}
                    item={item}
                    onOpen={() => router.push(`/dashboard/kpi/metrics/${item.metricId}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
