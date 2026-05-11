'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────────
   Chart Container

   Minimal wrapper for Recharts visualizations.
   Quiet surfaces, minimal grid, soft tooltips.
   ──────────────────────────────────────────────────────────────────────────── */

export interface ChartContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  height?: number;
  className?: string;
}

export function ChartContainer({
  children,
  title,
  description,
  action,
  height = 280,
  className,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-xedu-border bg-xedu-bg-panel p-5 dark:bg-xedu-bg-panel',
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-xedu-slate-900 dark:text-xedu-slate-100">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div style={{ height }}>{children}</div>
    </div>
  );
}

/* ── Shared Recharts tooltip styles ──────────────────────────────────────── */

export const chartTooltipStyle = {
  backgroundColor: 'var(--xedu-slate-900)',
  border: 'none',
  borderRadius: '10px',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 500,
  color: '#fff',
  boxShadow: 'var(--xedu-shadow-floating)',
} as React.CSSProperties;

export const chartGridColor = 'var(--xedu-slate-100)';
export const chartGridColorDark = 'var(--xedu-slate-800)';
export const chartAxisColor = 'var(--xedu-slate-400)';
