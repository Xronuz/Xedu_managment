'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, type EmptyStateProps } from './empty-state';

/* ────────────────────────────────────────────────────────────────────────────
   Data List

   Institutional list wrapper with consistent loading, error, empty states.
   No random card styles. Clean divide-y rows.
   ──────────────────────────────────────────────────────────────────────────── */

export interface DataListProps<T> {
  data: T[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
  emptyTitle: string;
  emptyDescription?: string;
  emptyIcon?: EmptyStateProps['icon'];
  renderRow: (item: T, index: number) => React.ReactNode;
  rowHeight?: number;
  className?: string;
  skeletonRows?: number;
}

export function DataList<T>({
  data,
  isLoading,
  error,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  renderRow,
  className,
  skeletonRows = 4,
}: DataListProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('space-y-0', className)}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-xedu-slate-50 py-3 last:border-b-0 dark:border-xedu-slate-800/40"
          >
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3 max-w-[180px]" />
              <Skeleton className="h-3 w-1/4 max-w-[120px]" />
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Ma'lumotni yuklab bo'lmadi"
        description="Iltimos, keyinroq qayta urinib ko'ring."
        className="py-8"
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        className="py-8"
      />
    );
  }

  return (
    <div className={cn('divide-y divide-xedu-slate-50 dark:divide-xedu-slate-800/40', className)}>
      {data.map((item, index) => renderRow(item, index))}
    </div>
  );
}
