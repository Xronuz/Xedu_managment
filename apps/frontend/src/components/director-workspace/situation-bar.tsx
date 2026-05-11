'use client';

import { Building2, AlertTriangle, CheckCircle2, Clock, BarChart3, Activity, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface SituationBarData {
  activeBranchName?: string | null;
  totalBranches?: number;
  alertCount?: number;
  pendingApprovals?: number;
  riskSignals?: number;
  attendancePct?: number | null;
  systemStatus?: 'ok' | 'warning' | 'error' | 'unknown';
}

interface SituationBarProps {
  data: SituationBarData;
  onAlertsClick?: () => void;
  onApprovalsClick?: () => void;
}

export function SituationBar({ data, onAlertsClick, onApprovalsClick }: SituationBarProps) {
  const {
    activeBranchName,
    totalBranches = 0,
    alertCount = 0,
    pendingApprovals = 0,
    riskSignals = 0,
    attendancePct,
    systemStatus = 'ok',
  } = data;

  return (
    <div className="flex items-center gap-6 md:gap-10 overflow-x-auto py-2 scrollbar-hide">
      {/* ── Group 1: Branch context ── */}
      <div className="flex items-center shrink-0">
        <SituationItem
          icon={Building2}
          label={activeBranchName ?? 'Barcha filiallar'}
          sub={totalBranches > 1 ? `${totalBranches} ta filial` : undefined}
          href="/dashboard/branches"
          prominence="high"
        />
      </div>

      {/* ── Group 2: Operational signals ── */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        <SituationItem
          icon={AlertTriangle}
          label="Diqqat"
          value={alertCount}
          tone={alertCount > 0 ? 'urgent' : 'calm'}
          onClick={alertCount > 0 ? onAlertsClick : undefined}
          clickable={alertCount > 0}
        />
        <SituationItem
          icon={Clock}
          label="Tasdiqlash"
          value={pendingApprovals}
          tone={pendingApprovals > 0 ? 'attention' : 'calm'}
          onClick={pendingApprovals > 0 ? onApprovalsClick : undefined}
          clickable={pendingApprovals > 0}
        />
        <SituationItem
          icon={BarChart3}
          label="Xavf"
          value={riskSignals}
          tone={riskSignals > 0 ? 'attention' : 'calm'}
          href="/dashboard/ai-analytics"
          clickable={riskSignals > 0}
        />
      </div>

      {/* ── Group 3: System context ── */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-auto">
        <SituationItem
          icon={Activity}
          label="Davomat"
          sub={attendancePct != null ? `${attendancePct}%` : "Ma'lumot yo'q"}
          tone={attendancePct != null && attendancePct < 80 ? 'attention' : 'calm'}
          href="/dashboard/attendance"
        />
        <SituationItem
          icon={ShieldCheck}
          label="Tizim"
          sub={systemStatus === 'ok' ? 'Ishlayapti' : systemStatus === 'warning' ? 'Diqqat' : 'Xato'}
          tone={systemStatus === 'ok' ? 'calm' : systemStatus === 'warning' ? 'attention' : 'urgent'}
          href="/dashboard/system-health"
        />
      </div>
    </div>
  );
}

interface SituationItemProps {
  icon: React.ElementType;
  label: string;
  value?: number;
  sub?: string;
  tone?: 'calm' | 'attention' | 'urgent';
  href?: string;
  onClick?: () => void;
  clickable?: boolean;
  prominence?: 'normal' | 'high';
}

function SituationItem({ icon: Icon, label, value, sub, tone = 'calm', href, onClick, clickable, prominence = 'normal' }: SituationItemProps) {
  const dotColor =
    tone === 'urgent' ? 'bg-xedu-ruby-500' : tone === 'attention' ? 'bg-xedu-amber-500' : 'bg-xedu-primary';

  const Wrapper = href ? Link : onClick ? 'button' : 'div';
  const wrapperProps = href ? { href } : onClick ? { onClick } : {};

  const isHighProminence = prominence === 'high';

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'flex items-center gap-2 rounded-lg shrink-0 transition-colors',
        isHighProminence ? 'px-4 py-2.5' : 'px-3 py-2',
        (clickable || href || onClick) && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50 cursor-pointer'
      )}
    >
      <div className="relative">
        <Icon className={cn('text-xedu-slate-500', isHighProminence ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
        {(value !== undefined && value > 0) && (
          <div className={cn('absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full', dotColor)} />
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn(
          'font-semibold whitespace-nowrap',
          isHighProminence ? 'text-sm text-xedu-slate-800 dark:text-xedu-slate-200' : 'text-xs text-xedu-slate-600 dark:text-xedu-slate-400'
        )}>
          {label}
        </span>
        {value !== undefined && value > 0 && (
          <span className={cn(
            'font-bold tabular-nums',
            isHighProminence ? 'text-base text-xedu-slate-900 dark:text-xedu-slate-100' : 'text-sm text-xedu-slate-900 dark:text-xedu-slate-100'
          )}>
            {value}
          </span>
        )}
        {sub && (
          <span className={cn(
            'whitespace-nowrap',
            isHighProminence ? 'text-xs text-xedu-slate-400' : 'text-2xs text-xedu-slate-400'
          )}>{sub}</span>
        )}
      </div>
    </Wrapper>
  );
}
