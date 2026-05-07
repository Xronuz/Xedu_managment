'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Inbox, type LucideIcon } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Empty State

   Institutional, not playful. No childish illustrations.
   Short copy. Quiet surface.
   ──────────────────────────────────────────────────────────────────────────── */

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-xedu-slate-50 dark:bg-xedu-slate-800">
        <Icon className="h-5 w-5 text-xedu-slate-400 dark:text-xedu-slate-500" strokeWidth={1.6} />
      </div>
      <p className="mt-3 text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300">
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-xedu-slate-400 dark:text-xedu-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
