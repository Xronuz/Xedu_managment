'use client';

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

export function FinancialPulse({ financeData, isLoading }: FinancialPulseProps) {
  if (isLoading) {
    return (
      <WorkspaceBlock title="Moliya" icon={TrendingUp} action={{ label: 'Batafsil', href: '/dashboard/finance' }}>
        <div className="p-3 space-y-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
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
        <div className="flex items-center gap-3 px-3 py-3">
          <TrendingUp className="h-4 w-4 text-xedu-slate-300 shrink-0" />
          <div>
            <p className="text-sm font-medium text-xedu-slate-500">Ma&apos;lumot mavjud emas</p>
            <p className="text-[11px] text-xedu-slate-400">To&apos;lovlar kiritilganda statistika ko&apos;rsatiladi</p>
          </div>
        </div>
      </WorkspaceBlock>
    );
  }

  const growthPositive = growth >= 0;
  const GrowthIcon = growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : Minus;

  return (
    <WorkspaceBlock title="Moliya" icon={TrendingUp} action={{ label: 'Batafsil', href: '/dashboard/finance' }}>
      <div className="px-3 py-2">
        {/* Primary metric */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <p className="text-lg font-black tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
            {formatCurrency(thisMonth)}
          </p>
          <div className="flex items-center gap-0.5">
            <GrowthIcon className={`h-3 w-3 ${growthPositive ? 'text-xedu-primary' : 'text-red-500'}`} />
            <span className={`text-[11px] font-bold ${growthPositive ? 'text-xedu-primary' : 'text-red-500'}`}>
              {Math.abs(growth).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Secondary row */}
        <div className="flex gap-1.5">
          <FinPill label="O'tgan oy" value={formatCurrency(lastMonth)} />
          <FinPill label="Kutilmoqda" value={formatCurrency(pending)} tone={pending > 0 ? 'attention' : 'calm'} />
          <FinPill label="Kechikkan" value={formatCurrency(overdue)} tone={overdue > 0 ? 'urgent' : 'calm'} />
        </div>
      </div>
    </WorkspaceBlock>
  );
}

function FinPill({ label, value, tone = 'calm' }: { label: string; value: string; tone?: 'calm' | 'attention' | 'urgent' }) {
  const valueColor =
    tone === 'urgent'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'attention'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-xedu-slate-700 dark:text-xedu-slate-300';

  return (
    <div className="flex-1 rounded-md border border-xedu-slate-100 dark:border-xedu-slate-800 px-2 py-1">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-xedu-slate-400">{label}</p>
      <p className={`text-[11px] font-bold tabular-nums leading-tight ${valueColor}`}>{value}</p>
    </div>
  );
}
