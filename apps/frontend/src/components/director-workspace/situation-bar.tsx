'use client';

import {
  Building2, Clock, BarChart3, Activity, Users, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface SituationBarData {
  activeBranchName?: string | null;
  totalBranches?: number;
  alertCount?: number;
  pendingApprovals?: number;
  riskSignals?: number;
  attendancePct?: number | null;
  staffTotal?: number;
  revenueGrowth?: number | null;
}

interface SituationBarProps {
  data: SituationBarData;
  onAlertsClick?: () => void;
  onApprovalsClick?: () => void;
}

type Tone = 'calm' | 'attention' | 'urgent';

export function SituationBar({ data, onAlertsClick, onApprovalsClick }: SituationBarProps) {
  const {
    activeBranchName,
    totalBranches = 0,
    pendingApprovals = 0,
    riskSignals = 0,
    attendancePct,
    staffTotal = 0,
    revenueGrowth = null,
  } = data;

  const attLabel = attendancePct != null ? `${attendancePct}%` : '—';
  const attTone: Tone = attendancePct != null && attendancePct < 80 ? 'attention' : 'calm';

  const revLabel = revenueGrowth != null
    ? `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`
    : '—';
  const revTone: Tone = revenueGrowth != null && revenueGrowth < 0 ? 'attention' : 'calm';

  return (
    <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide py-1 px-0.5">

      {/* 1. Filial kontekst */}
      <Chip
        icon={Building2}
        label={activeBranchName ?? 'Barcha filiallar'}
        metric={totalBranches > 1 ? `${totalBranches} ta` : undefined}
        href="/dashboard/branches"
        tone="calm"
      />

      <Sep />

      {/* 2-4. Operatsion ko'rsatkichlar */}
      <Chip
        icon={Activity}
        label="Davomat"
        metric={attLabel}
        href="/dashboard/attendance"
        tone={attTone}
      />
      <Chip
        icon={Users}
        label="Xodimlar"
        metric={staffTotal > 0 ? staffTotal : '—'}
        href="/dashboard/users"
        tone="calm"
      />
      <Chip
        icon={TrendingUp}
        label="Moliya"
        metric={revLabel}
        href="/dashboard/finance"
        tone={revTone}
      />

      <Sep />

      {/* 5-6. Harakatga chaqiruvchi signallar */}
      <Chip
        icon={Clock}
        label="Tasdiqlash"
        metric={pendingApprovals > 0 ? pendingApprovals : '—'}
        onClick={pendingApprovals > 0 ? onApprovalsClick : undefined}
        href={pendingApprovals === 0 ? '/dashboard/approvals' : undefined}
        tone={pendingApprovals > 0 ? 'attention' : 'calm'}
      />
      <Chip
        icon={BarChart3}
        label="Xavf"
        metric={riskSignals > 0 ? riskSignals : '—'}
        href="/dashboard/ai-analytics"
        tone={riskSignals > 0 ? 'attention' : 'calm'}
      />

    </div>
  );
}

interface ChipProps {
  icon: React.ElementType;
  label: string;
  metric?: string | number;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  prominent?: boolean;
}

function Chip({ icon: Icon, label, metric, tone = 'calm', href, onClick, prominent }: ChipProps) {
  const isInteractive = !!(href || onClick);

  const chipBg: Record<Tone, string> = {
    urgent:    'bg-xedu-ruby-50/70 border-xedu-ruby-200/70 dark:bg-xedu-ruby-900/20 dark:border-xedu-ruby-800/40',
    attention: 'bg-xedu-amber-50/60 border-xedu-amber-200/60 dark:bg-xedu-amber-900/15 dark:border-xedu-amber-800/30',
    calm:      'bg-xedu-bg-panel border-xedu-border dark:bg-xedu-bg-panel dark:border-xedu-border',
  };

  const iconColor: Record<Tone, string> = {
    urgent:    'text-xedu-ruby-500',
    attention: 'text-xedu-amber-500',
    calm:      'text-xedu-slate-400',
  };

  const metricColor: Record<Tone, string> = {
    urgent:    'text-xedu-ruby-700 dark:text-xedu-ruby-400',
    attention: 'text-xedu-amber-700 dark:text-xedu-amber-400',
    calm:      'text-xedu-slate-800 dark:text-xedu-slate-200',
  };

  const Wrapper = href ? Link : onClick ? 'button' : 'div';
  const wrapperProps = href ? { href } : onClick ? { onClick } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'flex items-center gap-2 rounded-xl shrink-0 border transition-all duration-150',
        chipBg[tone],
        prominent ? 'px-3.5 py-2.5 shadow-sm' : 'px-2.5 py-1.5',
        isInteractive && 'hover:-translate-y-px hover:shadow-sm cursor-pointer'
      )}
    >
      <div className={cn(
        'flex items-center justify-center rounded-lg shrink-0',
        prominent ? 'h-7 w-7 bg-xedu-bg-subtle dark:bg-xedu-slate-800/60' : 'h-5 w-5'
      )}>
        <Icon className={cn(iconColor[tone], prominent ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn(
          'font-semibold whitespace-nowrap text-xedu-slate-500 dark:text-xedu-slate-400',
          prominent ? 'text-xs' : 'text-2xs'
        )}>
          {label}
        </span>
        {metric !== undefined && (
          <span className={cn(
            'font-bold tabular-nums whitespace-nowrap',
            metricColor[tone],
            prominent ? 'text-sm' : 'text-xs'
          )}>
            {metric}
          </span>
        )}
      </div>
    </Wrapper>
  );
}

function Sep() {
  return <div className="h-4 w-px bg-xedu-border shrink-0 hidden sm:block" />;
}
