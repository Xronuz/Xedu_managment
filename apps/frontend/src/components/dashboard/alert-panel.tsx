'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, Info, CheckCircle2, type LucideIcon,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Alert Panel

   Decision-oriented, not decorative.
   Used for critical alerts, pending approvals, risk notifications.
   ──────────────────────────────────────────────────────────────────────────── */

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AlertPanelProps {
  title: string;
  message?: string;
  severity?: AlertSeverity;
  count?: number;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const SEVERITY_CONFIG: Record<AlertSeverity, {
  icon: LucideIcon;
  border: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
}> = {
  critical: {
    icon: AlertTriangle,
    border: 'border-xedu-ruby/20',
    bg: 'bg-red-50/60 dark:bg-red-950/20',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-xedu-ruby',
    titleColor: 'text-xedu-ruby',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-xedu-amber/20',
    bg: 'bg-amber-50/60 dark:bg-amber-950/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-xedu-amber',
    titleColor: 'text-xedu-amber',
  },
  info: {
    icon: Info,
    border: 'border-xedu-sky/20',
    bg: 'bg-sky-50/60 dark:bg-sky-950/20',
    iconBg: 'bg-sky-100 dark:bg-sky-900/30',
    iconColor: 'text-xedu-sky',
    titleColor: 'text-xedu-sky',
  },
  success: {
    icon: CheckCircle2,
    border: 'border-xedu-primary/20',
    bg: 'bg-xedu-primary-light/40 dark:bg-xedu-primary/10',
    iconBg: 'bg-xedu-primary-light dark:bg-xedu-primary/20',
    iconColor: 'text-xedu-primary',
    titleColor: 'text-xedu-primary',
  },
};

export function AlertPanel({
  title,
  message,
  severity = 'info',
  count,
  action,
  onClick,
  className,
}: AlertPanelProps) {
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { onClick, type: 'button' } : {})}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 transition-all duration-[var(--xedu-duration)]',
        cfg.border,
        cfg.bg,
        onClick && 'cursor-pointer hover:shadow-sm',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          cfg.iconBg,
        )}
      >
        <Icon className={cn('h-4 w-4', cfg.iconColor)} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-semibold', cfg.titleColor)}>
            {title}
          </p>
          {count !== undefined && count > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-xedu-slate-900 px-1.5 text-[10px] font-bold text-white dark:bg-white dark:text-xedu-slate-900">
              {count}
            </span>
          )}
        </div>
        {message && (
          <p className="mt-0.5 text-xs text-xedu-slate-600 dark:text-xedu-slate-400">
            {message}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </Tag>
  );
}
