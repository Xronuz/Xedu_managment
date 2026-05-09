'use client';

import { cn } from '@/lib/utils';
import { GraduationCap } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   STUDENT SHELL
   Focused, distraction-free layout for student portal.

   Principles:
   - Schedule-first, homework-prominent
   - No gamification, no dopamine mechanisms
   - Calm academic environment
   - Progress visible but understated
   ═══════════════════════════════════════════════════════════════════════════════ */

interface StudentShellProps {
  children: React.ReactNode;
  className?: string;
  density?: 'compact' | 'normal' | 'spacious';
}

export function StudentShell({
  children,
  className,
  density = 'normal',
}: StudentShellProps) {
  const densityClass = {
    compact: 'space-y-3',
    normal: 'space-y-5',
    spacious: 'space-y-7',
  }[density];

  return (
    <div className={cn('relative pb-24 md:pb-6 max-w-5xl mx-auto', densityClass, className)}>
      {children}
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────────── */

interface StudentHeaderProps {
  greeting?: string;
  subtitle?: string;
  className?: string;
  rightContent?: React.ReactNode;
}

export function StudentHeader({
  greeting,
  subtitle,
  className,
  rightContent,
}: StudentHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-xedu-teal/10 text-xedu-teal">
            <GraduationCap className="h-4 w-4" />
          </div>
          {greeting && (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
              {greeting}
            </h1>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-1 ml-10">
            {subtitle}
          </p>
        )}
      </div>
      {rightContent && (
        <div className="shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  );
}

/* ── Academic Day Block ─────────────────────────────────────────────────────── */

interface StudentDayBlockProps {
  dateLabel: string;
  children: React.ReactNode;
  className?: string;
  isToday?: boolean;
}

export function StudentDayBlock({ dateLabel, children, className, isToday }: StudentDayBlockProps) {
  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        isToday
          ? 'border-xedu-primary/20 bg-xedu-primary/[0.02] dark:bg-xedu-primary/5'
          : 'border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900',
        className
      )}
    >
      <div className="px-4 py-2 border-b border-xedu-slate-100 dark:border-xedu-slate-800 flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', isToday ? 'bg-xedu-primary' : 'bg-xedu-slate-300')} />
        <span className={cn('text-xs font-semibold', isToday ? 'text-xedu-primary' : 'text-xedu-slate-500')}>
          {dateLabel}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {children}
      </div>
    </div>
  );
}

/* ── Progress Indicator (calm, no gamification) ─────────────────────────────── */

interface StudentProgressProps {
  label: string;
  value: number; // 0-100
  className?: string;
  tone?: 'neutral' | 'positive' | 'caution';
}

export function StudentProgress({ label, value, className, tone = 'neutral' }: StudentProgressProps) {
  const toneClasses = {
    neutral: 'bg-xedu-slate-200 dark:bg-xedu-slate-700',
    positive: 'bg-xedu-teal',
    caution: 'bg-xedu-amber',
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-xedu-slate-600 dark:text-xedu-slate-400">{label}</span>
        <span className="text-xs font-medium text-xedu-slate-700 dark:text-xedu-slate-300">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', toneClasses[tone])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
