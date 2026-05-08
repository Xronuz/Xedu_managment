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
    <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {/* Branch context */}
      <SituationItem
        icon={Building2}
        label={activeBranchName ?? 'Barcha filiallar'}
        sub={totalBranches > 1 ? `${totalBranches} ta filial` : undefined}
        href="/dashboard/branches"
      />

      <Divider />

      {/* Alerts */}
      <SituationItem
        icon={AlertTriangle}
        label="Diqqat"
        value={alertCount}
        tone={alertCount > 0 ? 'urgent' : 'calm'}
        onClick={alertCount > 0 ? onAlertsClick : undefined}
        clickable={alertCount > 0}
      />

      {/* Pending approvals */}
      <SituationItem
        icon={Clock}
        label="Tasdiqlash"
        value={pendingApprovals}
        tone={pendingApprovals > 0 ? 'attention' : 'calm'}
        onClick={pendingApprovals > 0 ? onApprovalsClick : undefined}
        clickable={pendingApprovals > 0}
      />

      {/* Risk signals */}
      <SituationItem
        icon={BarChart3}
        label="Xavf signallari"
        value={riskSignals}
        tone={riskSignals > 0 ? 'attention' : 'calm'}
        href="/dashboard/ai-analytics"
        clickable={riskSignals > 0}
      />

      <Divider />

      {/* Academic context */}
      <SituationItem
        icon={Activity}
        label="Davomat"
        sub={attendancePct != null ? `${attendancePct}%` : "Ma'lumot yo'q"}
        tone={attendancePct != null && attendancePct < 80 ? 'attention' : 'calm'}
        href="/dashboard/attendance"
      />

      {/* System status */}
      <SituationItem
        icon={ShieldCheck}
        label="Tizim"
        sub={systemStatus === 'ok' ? 'Ishlayapti' : systemStatus === 'warning' ? 'Diqqat' : 'Xato'}
        tone={systemStatus === 'ok' ? 'calm' : systemStatus === 'warning' ? 'attention' : 'urgent'}
        href="/dashboard/system-health"
      />
    </div>
  );
}

function Divider() {
  return <div className="h-4 w-px bg-xedu-slate-200 dark:bg-xedu-slate-700 shrink-0 hidden sm:block" />;
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
}

function SituationItem({ icon: Icon, label, value, sub, tone = 'calm', href, onClick, clickable }: SituationItemProps) {
  const dotColor =
    tone === 'urgent' ? 'bg-red-500' : tone === 'attention' ? 'bg-amber-500' : 'bg-xedu-primary';

  const Wrapper = href ? Link : onClick ? 'button' : 'div';
  const wrapperProps = href ? { href } : onClick ? { onClick } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 shrink-0 transition-colors',
        (clickable || href || onClick) && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50 cursor-pointer'
      )}
    >
      <div className="relative">
        <Icon className="h-3.5 w-3.5 text-xedu-slate-400" />
        {(value !== undefined && value > 0) && (
          <div className={cn('absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full', dotColor)} />
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-semibold text-xedu-slate-600 dark:text-xedu-slate-400 whitespace-nowrap">
          {label}
        </span>
        {value !== undefined && value > 0 && (
          <span className="text-[11px] font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">
            {value}
          </span>
        )}
        {sub && (
          <span className="text-[11px] font-medium text-xedu-slate-500 whitespace-nowrap">{sub}</span>
        )}
      </div>
    </Wrapper>
  );
}
