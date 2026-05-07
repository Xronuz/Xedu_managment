'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────────
   Status Badge

   Compact semantic indicator. No playful colors.
   Maps status strings to institutional color pairs.
   ──────────────────────────────────────────────────────────────────────────── */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
}

const TONE_STYLES: Record<StatusTone, string> = {
  success:
    'bg-xedu-primary-light text-xedu-primary dark:bg-xedu-primary/20 dark:text-xedu-primary',
  warning:
    'bg-amber-50 text-xedu-amber dark:bg-amber-900/20 dark:text-xedu-amber',
  danger:
    'bg-red-50 text-xedu-ruby dark:bg-red-900/20 dark:text-xedu-ruby',
  info:
    'bg-sky-50 text-xedu-sky dark:bg-sky-900/20 dark:text-xedu-sky',
  neutral:
    'bg-xedu-slate-100 text-xedu-slate-600 dark:bg-xedu-slate-800 dark:text-xedu-slate-400',
};

const DOT_COLOR: Record<StatusTone, string> = {
  success: 'bg-xedu-primary',
  warning: 'bg-xedu-amber',
  danger:  'bg-xedu-ruby',
  info:    'bg-xedu-sky',
  neutral: 'bg-xedu-slate-400',
};

export function StatusBadge({ label, tone = 'neutral', dot, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        TONE_STYLES[tone],
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLOR[tone])} />
      )}
      {label}
    </span>
  );
}

/* ── Config-driven status resolver ───────────────────────────────────────── */

export interface StatusConfig<T extends string> {
  label: string;
  tone: StatusTone;
}

export function resolveStatus<T extends string>(
  value: T | undefined,
  config: Record<T, StatusConfig<T>>,
): StatusConfig<T> | null {
  if (!value || !(value in config)) return null;
  return config[value];
}
