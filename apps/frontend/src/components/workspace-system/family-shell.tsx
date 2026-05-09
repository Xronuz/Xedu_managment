'use client';

import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   FAMILY SHELL
   Calm, executive layout for parent portal.

   Principles:
   - Multi-child context is first-class
   - Trust signals over gamification
   - Action-oriented but never overwhelming
   ═══════════════════════════════════════════════════════════════════════════════ */

interface FamilyShellProps {
  children: React.ReactNode;
  className?: string;
  density?: 'compact' | 'normal' | 'spacious';
}

export function FamilyShell({
  children,
  className,
  density = 'normal',
}: FamilyShellProps) {
  const densityClass = {
    compact: 'space-y-3',
    normal: 'space-y-5',
    spacious: 'space-y-7',
  }[density];

  return (
    <div className={cn('relative pb-24 md:pb-6 max-w-6xl mx-auto', densityClass, className)}>
      {children}
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────────── */

interface FamilyHeaderProps {
  title: string;
  subtitle?: string;
  childSelector?: React.ReactNode;
  trustSignal?: React.ReactNode;
  className?: string;
}

export function FamilyHeader({
  title,
  subtitle,
  childSelector,
  trustSignal,
  className,
}: FamilyHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-xedu-primary/10 text-xedu-primary">
              <Users className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-1 ml-10">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {childSelector}
        </div>
      </div>
      {trustSignal && (
        <div className="flex items-center gap-2 text-xs text-xedu-slate-400 dark:text-xedu-slate-500 bg-xedu-slate-50 dark:bg-xedu-slate-800/50 rounded-lg px-3 py-2">
          {trustSignal}
        </div>
      )}
    </div>
  );
}

/* ── Quick Stats Row ────────────────────────────────────────────────────────── */

interface FamilyQuickStatsProps {
  children: React.ReactNode;
  className?: string;
}

export function FamilyQuickStats({ children, className }: FamilyQuickStatsProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
      {children}
    </div>
  );
}

/* ── Main Content Area ──────────────────────────────────────────────────────── */

interface FamilyMainProps {
  children: React.ReactNode;
  className?: string;
}

export function FamilyMain({ children, className }: FamilyMainProps) {
  return (
    <div className={cn('flex-1 min-w-0 space-y-4', className)}>
      {children}
    </div>
  );
}

/* ── Sidebar / Context Panel ────────────────────────────────────────────────── */

interface FamilySidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function FamilySidebar({ children, className }: FamilySidebarProps) {
  return (
    <div className={cn('w-full lg:w-[300px] xl:w-[340px] shrink-0 space-y-3', className)}>
      {children}
    </div>
  );
}
