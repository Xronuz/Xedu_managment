'use client';

import { cn } from '@/lib/utils';
import {
  ArrowUpRight, ArrowDownRight, Minus, Building2, Users,
  TrendingUp, Wallet, AlertTriangle, Brain,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   EXECUTIVE SUMMARY STRIP
   Compact institutional pulse. Bloomberg-terminal density, not SaaS KPIs.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface ExecutiveSummaryData {
  branchCount: number;
  branchTrend?: 'up' | 'down' | 'stable';
  attendancePct: number | null;
  attendanceTrend?: 'up' | 'down' | 'stable';
  staffTotal: number;
  staffPressure?: 'normal' | 'elevated' | 'critical';
  revenueGrowth?: number | null;
  pendingTotal: number;
  pendingTrend?: 'up' | 'down' | 'stable';
  atRiskCount: number;
  riskTrend?: 'up' | 'down' | 'stable';
}

interface ExecutiveSummaryProps {
  data: ExecutiveSummaryData;
}

export function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  const {
    branchCount,
    branchTrend = 'stable',
    attendancePct,
    attendanceTrend = 'stable',
    staffTotal,
    staffPressure = 'normal',
    revenueGrowth,
    pendingTotal,
    pendingTrend = 'stable',
    atRiskCount,
    riskTrend = 'stable',
  } = data;

  return (
    <div className="flex items-center gap-1 md:gap-3 overflow-x-auto scrollbar-hide px-1 py-1.5">
      <SummaryItem
        icon={Building2}
        label="Filiallar"
        value={branchCount}
        trend={branchTrend}
      />
      <Divider />
      <SummaryItem
        icon={TrendingUp}
        label="Davomat"
        value={attendancePct != null ? `${attendancePct}%` : '—'}
        trend={attendanceTrend}
        trendInvert
      />
      <Divider />
      <SummaryItem
        icon={Users}
        label="Xodimlar"
        value={staffTotal}
        pressure={staffPressure}
      />
      <Divider />
      <SummaryItem
        icon={Wallet}
        label="Moliya"
        value={revenueGrowth != null ? `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%` : '—'}
        trend={revenueGrowth != null ? (revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable') : 'stable'}
      />
      <Divider />
      <SummaryItem
        icon={AlertTriangle}
        label="Kutilmoqda"
        value={pendingTotal}
        trend={pendingTrend}
        trendInvert
      />
      <Divider />
      <SummaryItem
        icon={Brain}
        label="Xavf ostida"
        value={atRiskCount}
        trend={riskTrend}
        trendInvert
        quiet={atRiskCount === 0}
      />
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  trend = 'stable',
  trendInvert = false,
  pressure,
  quiet = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendInvert?: boolean;
  pressure?: 'normal' | 'elevated' | 'critical';
  quiet?: boolean;
}) {
  const effectiveTrend = trendInvert
    ? trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'stable'
    : trend;

  const TrendIcon = effectiveTrend === 'up' ? ArrowUpRight : effectiveTrend === 'down' ? ArrowDownRight : Minus;
  const trendColor =
    effectiveTrend === 'up' ? 'text-xedu-primary' :
    effectiveTrend === 'down' ? 'text-xedu-ruby-500' :
    'text-xedu-slate-300';

  const pressureColor =
    pressure === 'critical' ? 'bg-xedu-ruby-500' :
    pressure === 'elevated' ? 'bg-xedu-amber-500' :
    'bg-xedu-slate-300';

  return (
    <div className={cn(
      'flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1 transition-colors',
      !quiet && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30'
    )}>
      <div className="relative">
        <Icon className={cn('h-3 w-3', quiet ? 'text-xedu-slate-300' : 'text-xedu-slate-400')} />
        {pressure && pressure !== 'normal' && (
          <div className={cn('absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full', pressureColor)} />
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-semibold text-xedu-slate-500 whitespace-nowrap">{label}</span>
        <span className={cn(
          'text-sm font-bold tabular-nums whitespace-nowrap',
          quiet ? 'text-xedu-slate-400' : 'text-xedu-slate-800 dark:text-xedu-slate-200'
        )}>
          {value}
        </span>
        <TrendIcon className={cn('h-2.5 w-2.5', trendColor)} />
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-3 w-px bg-xedu-slate-200 dark:bg-xedu-slate-700 shrink-0 hidden sm:block" />;
}
