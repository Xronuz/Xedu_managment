'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────────
   Section Header

   Institutional, quiet hierarchy. Used to separate dashboard sections.
   ──────────────────────────────────────────────────────────────────────────── */

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
