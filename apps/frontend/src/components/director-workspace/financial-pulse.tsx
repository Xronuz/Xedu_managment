'use client';

import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { WorkspaceBlock } from './branch-health-map';
import Link from 'next/link';

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
      <WorkspaceBlock title="Moliya holati" icon={TrendingUp} action={{ label: 'Batafsil', href: '/dashboard/finance' }}>
        <div className="p-4 space-y-3">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded" />
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
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
      <WorkspaceBlock title="Moliya holati" icon={TrendingUp} action={{ label: 'Batafsil', href: '/dashboard/finance' }}>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <TrendingUp className="h-6 w-6 text-xedu-slate-300" />
          <p className="text-sm font-medium text-xedu-slate-500">Moliyaviy ma&apos;lumotlar mavjud emas</p>
          <p className="text-xs text-xedu-slate-400">To&apos;lovlar kiritilganda statistika ko&apos;rsatiladi</p>
        </div>
      </WorkspaceBlock>
    );
  }

  const growthPositive = growth >= 0;
  const GrowthIcon = growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : Minus;

  return (
    <WorkspaceBlock title="Moliya holati" icon={TrendingUp} action={{ label: 'Batafsil', href: '/dashboard/finance' }}>
      <div className="p-4">
        {/* Primary metric */}
        <div className="flex items-baseline gap-3 mb-1">
          <p className="text-2xl font-black tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
            {formatCurrency(thisMonth)}
          </p>
          <div className="flex items-center gap-1">
            <GrowthIcon className={`h-3.5 w-3.5 ${growthPositive ? 'text-xedu-primary' : 'text-red-500'}`} />
            <span className={`text-xs font-bold ${growthPositive ? 'text-xedu-primary' : 'text-red-500'}`}>
              {Math.abs(growth).toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="text-xs text-xedu-slate-500 mb-4">Joriy oy tushumi</p>

        {/* Secondary grid */}
        <div className="grid grid-cols-3 gap-3">
          <FinPill
            label="O'tgan oy"
            value={formatCurrency(lastMonth)}
          />
          <FinPill
            label="Kutilmoqda"
            value={formatCurrency(pending)}
            tone={pending > 0 ? 'attention' : 'calm'}
          />
          <FinPill
            label="Kechiktirilgan"
            value={formatCurrency(overdue)}
            tone={overdue > 0 ? 'urgent' : 'calm'}
          />
        </div>
      </div>
    </WorkspaceBlock>
  );
}

function FinPill({ label, value, tone = 'calm' }: { label: string; value: string; tone?: 'calm' | 'attention' | 'urgent' }) {
  const valueColor =
    tone === 'urgent' ? 'text-red-600 dark:text-red-400' : tone === 'attention' ? 'text-amber-600 dark:text-amber-400' : 'text-xedu-slate-800 dark:text-xedu-slate-200';

  return (
    <div className="rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-xedu-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}
