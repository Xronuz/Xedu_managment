'use client';

import React, { memo } from 'react';
import {
  Building2, Clock, BarChart3, Activity, Users, TrendingUp, Megaphone,
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

export const SituationBar = memo(function SituationBar({ data, onAlertsClick, onApprovalsClick }: SituationBarProps) {
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
    <div className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide py-1.5 px-0.5">

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
        href="/dashboard/staff"
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
        href="/dashboard/insights"
        tone={riskSignals > 0 ? 'attention' : 'calm'}
      />

      <Sep />

      {/* E'lon — sidebar da yo'q, tez kirish uchun */}
      <Chip
        icon={Megaphone}
        label="E'lon"
        href="/dashboard/announcements"
        tone="calm"
      />

    </div>
  );
});

interface ChipProps {
  icon: React.ElementType;
  label: string;
  metric?: string | number;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
}

function Chip({ icon: Icon, label, metric, tone = 'calm', href, onClick }: ChipProps) {
  const isInteractive = !!(href || onClick);

  const chipMaterial: Record<Tone, string> = {
    urgent:    'xedu-material-chip-urgent',
    attention: 'xedu-material-chip-attention',
    calm:      'xedu-material-chip',
  };

  const iconContainer: Record<Tone, string> = {
    urgent:    'bg-xedu-ruby-100/60 text-xedu-ruby-600 dark:bg-xedu-ruby-900/30 dark:text-xedu-ruby-400',
    attention: 'bg-xedu-amber-100/60 text-xedu-amber-600 dark:bg-xedu-amber-900/30 dark:text-xedu-amber-400',
    calm:      'bg-xedu-primary-light/60 text-xedu-primary dark:bg-xedu-primary/15 dark:text-xedu-emerald-400',
  };

  const metricColor: Record<Tone, string> = {
    urgent:    'text-xedu-ruby-700 dark:text-xedu-ruby-400',
    attention: 'text-xedu-amber-700 dark:text-xedu-amber-400',
    calm:      'text-xedu-slate-900 dark:text-xedu-slate-100',
  };

  const labelColor: Record<Tone, string> = {
    urgent:    'text-xedu-ruby-600/80 dark:text-xedu-ruby-400/80',
    attention: 'text-xedu-amber-600/80 dark:text-xedu-amber-400/80',
    calm:      'text-xedu-slate-500 dark:text-xedu-slate-400',
  };

  const Wrapper = href ? Link : onClick ? 'button' : 'div';
  const wrapperProps = href ? { href } : onClick ? { onClick } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'flex items-center gap-2.5 rounded-xl shrink-0 cursor-default',
        'px-3 py-2',
        chipMaterial[tone],
        isInteractive && 'cursor-pointer xedu-tactile-hover'
      )}
    >
      <div className={cn(
        'flex items-center justify-center rounded-lg shrink-0',
        'h-6 w-6',
        iconContainer[tone]
      )}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn(
          'font-semibold whitespace-nowrap',
          'text-2xs uppercase tracking-wider',
          labelColor[tone]
        )}>
          {label}
        </span>
        {metric !== undefined && (
          <span className={cn(
            'font-bold tabular-nums whitespace-nowrap text-sm',
            metricColor[tone]
          )}>
            {metric}
          </span>
        )}
      </div>
    </Wrapper>
  );
}

function Sep() {
  return <div className="h-5 w-px bg-xedu-border shrink-0 hidden sm:block" />;
}
