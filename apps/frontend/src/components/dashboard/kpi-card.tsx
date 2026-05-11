'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Xedu KPI Card System

   Philosophy:
   - Numbers are the hero — everything else is quiet.
   - No neon, no gradients, no playful backgrounds.
   - Accent colors ONLY for semantic status (up/down/warning).
   - Motion: 150ms or never.
   ──────────────────────────────────────────────────────────────────────────── */

export type KpiTrend = 'up' | 'down' | 'neutral';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  delta?: string;
  trend?: KpiTrend;
  description?: string;
  icon?: LucideIcon;
  iconColor?: 'primary' | 'gold' | 'ruby' | 'amber' | 'sky' | 'violet';
  loading?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ICON_BG_MAP: Record<NonNullable<KpiCardProps['iconColor']>, string> = {
  primary: 'bg-xedu-primary-light text-xedu-primary',
  gold:    'bg-xedu-gold-50 text-xedu-gold',
  ruby:    'bg-red-50 text-xedu-ruby',
  amber:   'bg-amber-50 text-xedu-amber',
  sky:     'bg-sky-50 text-xedu-sky',
  violet:  'bg-violet-50 text-xedu-violet',
};

const TREND_ICON: Record<KpiTrend, React.ElementType> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const TREND_COLOR: Record<KpiTrend, string> = {
  up:   'text-xedu-primary',
  down: 'text-xedu-ruby',
  neutral: 'text-xedu-slate-400',
};

export function KpiCard({
  label,
  value,
  delta,
  trend = 'neutral',
  description,
  icon: Icon,
  iconColor = 'primary',
  loading,
  href,
  onClick,
  className,
}: KpiCardProps) {
  const Tag = href ? 'a' : onClick ? 'button' : 'div';

  return (
    <Tag
      {...(href ? { href } : {})}
      {...(onClick ? { onClick, type: 'button' } : {})}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border border-xedu-slate-100 bg-white p-5 transition-all duration-[var(--xedu-duration)] dark:border-xedu-slate-800 dark:bg-xedu-slate-900',
        (href || onClick) && 'cursor-pointer hover:border-xedu-slate-200 hover:shadow-sm dark:hover:border-xedu-slate-700',
        className,
      )}
    >
      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between">
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              ICON_BG_MAP[iconColor],
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </div>
        )}
        {delta && (
          <div className={cn('flex items-center gap-1 text-2xs font-semibold', TREND_COLOR[trend])}>
            {React.createElement(TREND_ICON[trend], { className: 'h-3 w-3' })}
            <span>{delta}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded-md bg-xedu-slate-100 dark:bg-xedu-slate-800" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
            {value}
          </p>
        )}
      </div>

      {/* Label + description */}
      <div className="mt-1">
        <p className="text-xs font-medium text-xedu-slate-500 dark:text-xedu-slate-400">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-2xs text-xedu-slate-400 dark:text-xedu-slate-500">
            {description}
          </p>
        )}
      </div>
    </Tag>
  );
}

/* ── KPI Strip ───────────────────────────────────────────────────────────── */

export function KpiStrip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        /* responsive: 1 col mobile, 2 sm, 3 md, 4 lg */
        'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
