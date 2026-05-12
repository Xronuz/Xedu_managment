'use client';

import { memo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { WorkspaceBlock } from './branch-health-map';

interface FinancialPulseProps {
  financeData?: {
    thisMonthRevenue?: number;
    lastMonthRevenue?: number;
    revenueGrowth?: number;
    pendingAmount?: number;
    overdueAmount?: number;
    totalRevenue?: number;
  } | null;
  isLoading: boolean;
}

export const FinancialPulse = memo(function FinancialPulse({ financeData, isLoading }: FinancialPulseProps) {
  if (isLoading) {
    return (
      <WorkspaceBlock title="Moliya" icon={TrendingUp} action={{ label: 'Batafsil', href: '/dashboard/finance' }}>
        <div className="p-4 space-y-3">
          <Skeleton className="h-8 w-28 rounded-md" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 flex-1 rounded-md" />
          </div>
        </div>
      </WorkspaceBlock>
    );
  }

  const thisMonth = financeData?.thisMonthRevenue ?? 0;
  const lastMonth = financeData?.lastMonthRevenue ?? 0;
  const growth = financeData?.revenueGrowth ?? 0;
  const pending = financeData?.pendingAmount ?? 0;
  const overdue = financeData?.overdueAmount ?? 0;
  const hasData = thisMonth > 0 || lastMonth > 0 || pending > 0 || overdue > 0;

  if (!hasData) {
    return (
      <WorkspaceBlock title="Moliya" icon={TrendingUp} action={{ label: 'Batafsil', href: '/dashboard/finance' }}>
        <div className="flex items-center gap-3 px-4 py-4">
          <TrendingUp className="h-4 w-4 text-xedu-slate-300 shrink-0" />
          <div>
            <p className="text-sm font-medium text-xedu-slate-500">Ma&apos;lumot mavjud emas</p>
            <p className="text-xs text-xedu-slate-400">To&apos;lovlar kiritilganda statistika ko&apos;rsatiladi</p>
          </div>
        </div>
      </WorkspaceBlock>
    );
  }

  const growthPositive = growth >= 0;
  const GrowthIcon = growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : Minus;

  return (
    <WorkspaceBlock title="Moliya" icon={TrendingUp} action={{ label: 'Batafsil', href: '/dashboard/finance' }}>
      <div className="px-4 py-4 space-y-3">
        {/* Primary metric */}
        <div className="flex items-baseline gap-3">
          <p className="text-xl font-black tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
            {formatCurrency(thisMonth)}
          </p>
          <div className="flex items-center gap-1">
            <GrowthIcon className={`h-3.5 w-3.5 ${growthPositive ? 'text-xedu-primary' : 'text-xedu-ruby-500'}`} />
            <span className={`text-sm font-bold ${growthPositive ? 'text-xedu-primary' : 'text-xedu-ruby-500'}`}>
              {Math.abs(growth).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Secondary metrics — clean grid */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-xedu-border">
          <FinStat label="O'tgan oy" value={formatCurrency(lastMonth)} />
          <FinStat label="Kutilmoqda" value={formatCurrency(pending)} tone={pending > 0 ? 'attention' : 'calm'} />
          <FinStat label="Kechikkan" value={formatCurrency(overdue)} tone={overdue > 0 ? 'urgent' : 'calm'} />
        </div>
      </div>
    </WorkspaceBlock>
  );
});

function FinStat({ label, value, tone = 'calm' }: { label: string; value: string; tone?: 'calm' | 'attention' | 'urgent' }) {
  const valueColor =
    tone === 'urgent'
      ? 'text-xedu-ruby-600 dark:text-xedu-ruby-400'
      : tone === 'attention'
      ? 'text-xedu-amber-600 dark:text-xedu-amber-400'
      : 'text-xedu-slate-700 dark:text-xedu-slate-300';

  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}
