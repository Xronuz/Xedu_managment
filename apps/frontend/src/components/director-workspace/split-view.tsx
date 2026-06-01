'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface SplitViewProps {
  children: [React.ReactNode, React.ReactNode];
  showDetail: boolean;
  onHideDetail: () => void;
  listWidth?: string;
}

export function SplitView({
  children: [listPane, detailPane],
  showDetail,
  onHideDetail,
  listWidth = 'min-w-0 lg:w-[45%] xl:w-[420px]',
}: SplitViewProps) {
  // Mobile: show detail as overlay when active
  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[500px] gap-0 relative">
      {/* List pane */}
      <div
        className={cn(
          'flex flex-col h-full overflow-hidden',
          listWidth,
          'shrink-0 border-r border-xedu-slate-100 dark:border-xedu-slate-800',
          showDetail && 'hidden lg:flex'
        )}
      >
        {listPane}
      </div>

      {/* Detail pane */}
      <div
        className={cn(
          'flex-1 flex flex-col h-full overflow-hidden',
          !showDetail && 'hidden lg:flex'
        )}
      >
        {/* Mobile back button */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
          <button
            onClick={onHideDetail}
            className="flex items-center gap-1 text-sm font-medium text-xedu-slate-600 hover:text-xedu-slate-900 transition-colors min-h-[44px] min-w-[44px] px-2"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </button>
        </div>
        {detailPane}
      </div>

    </div>
  );
}

// ── List Header — sticky filter bar ──────────────────────────────────────────

export function SplitViewListHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2.5 border-b border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── List Body — scrollable ───────────────────────────────────────────────────

export function SplitViewListBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {children}
    </div>
  );
}

// ── Detail Header ────────────────────────────────────────────────────────────

export function SplitViewDetailHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800 xedu-frosted sticky top-0 z-10',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Detail Body ──────────────────────────────────────────────────────────────

export function SplitViewDetailBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-5 py-4', className)}>
      {children}
    </div>
  );
}
