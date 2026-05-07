'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────────
   Dashboard Card

   Institutional card wrapper. No playful shadows, no gradients.
   Consistent: header, optional description, content, optional actions.
   ──────────────────────────────────────────────────────────────────────────── */

export interface DashboardCardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function DashboardCard({
  children,
  header,
  title,
  description,
  action,
  className,
  contentClassName,
  noPadding,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-xedu-slate-100 bg-white dark:border-xedu-slate-800 dark:bg-xedu-slate-900',
        className,
      )}
    >
      {/* Header */}
      {(header || title) && (
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-0">
          {header ? (
            <div className="min-w-0 flex-1">{header}</div>
          ) : (
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-xedu-slate-900 dark:text-xedu-slate-100">
                {title}
              </h3>
              {description && (
                <p className="mt-0.5 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                  {description}
                </p>
              )}
            </div>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Content */}
      <div className={cn(!noPadding && 'p-6', contentClassName)}>{children}</div>
    </div>
  );
}
