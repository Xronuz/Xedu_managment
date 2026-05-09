'use client';

import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════════
   STATUS BADGE
   Standardized status indicator for all operational workspaces.

   Rules:
   - Compact, calm, institutional
   - No loud pill chaos
   - Quiet border + calm background
   - Optional status dot
   ═══════════════════════════════════════════════════════════════════════════════ */

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'premium'
  | 'ai'
  | 'pending'
  | 'active'
  | 'inactive'
  | 'draft'
  | 'published'
  | 'resolved'
  | 'unresolved'
  | 'paid'
  | 'overdue'
  | 'failed'
  | 'approved'
  | 'rejected';

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  dot?: boolean;
  className?: string;
}

const variantConfig: Record<StatusVariant, { bg: string; border: string; text: string; dot: string; defaultLabel: string }> = {
  success:    { bg: 'bg-xedu-emerald-50 dark:bg-xedu-emerald-900/20', border: 'border-xedu-emerald-200 dark:border-xedu-emerald-800', text: 'text-xedu-emerald-700 dark:text-xedu-emerald-300', dot: 'bg-xedu-emerald-500', defaultLabel: 'Muvaffaqiyatli' },
  warning:    { bg: 'bg-xedu-amber-50 dark:bg-xedu-amber-900/20', border: 'border-xedu-amber-200 dark:border-xedu-amber-800', text: 'text-xedu-amber-700 dark:text-xedu-amber-300', dot: 'bg-xedu-amber-500', defaultLabel: 'Diqqat' },
  danger:     { bg: 'bg-xedu-ruby-50 dark:bg-xedu-ruby-900/20', border: 'border-xedu-ruby-200 dark:border-xedu-ruby-800', text: 'text-xedu-ruby-700 dark:text-xedu-ruby-300', dot: 'bg-xedu-ruby-500', defaultLabel: 'Xavfli' },
  info:       { bg: 'bg-xedu-sky-50 dark:bg-xedu-sky-900/20', border: 'border-xedu-sky-200 dark:border-xedu-sky-800', text: 'text-xedu-sky-700 dark:text-xedu-sky-300', dot: 'bg-xedu-sky-500', defaultLabel: 'Ma\'lumot' },
  neutral:    { bg: 'bg-xedu-slate-50 dark:bg-xedu-slate-800/40', border: 'border-xedu-slate-200 dark:border-xedu-slate-700', text: 'text-xedu-slate-600 dark:text-xedu-slate-300', dot: 'bg-xedu-slate-400', defaultLabel: 'Noma\'lum' },
  premium:    { bg: 'bg-xedu-gold-50 dark:bg-xedu-gold-900/20', border: 'border-xedu-gold-200 dark:border-xedu-gold-800', text: 'text-xedu-gold-700 dark:text-xedu-gold-300', dot: 'bg-xedu-gold-500', defaultLabel: 'Premium' },
  ai:         { bg: 'bg-xedu-violet-50 dark:bg-xedu-violet-900/20', border: 'border-xedu-violet-200 dark:border-xedu-violet-800', text: 'text-xedu-violet-700 dark:text-xedu-violet-300', dot: 'bg-xedu-violet-500', defaultLabel: 'AI' },
  pending:    { bg: 'bg-xedu-amber-50 dark:bg-xedu-amber-900/20', border: 'border-xedu-amber-200 dark:border-xedu-amber-800', text: 'text-xedu-amber-700 dark:text-xedu-amber-300', dot: 'bg-xedu-amber-500', defaultLabel: 'Kutilmoqda' },
  active:     { bg: 'bg-xedu-emerald-50 dark:bg-xedu-emerald-900/20', border: 'border-xedu-emerald-200 dark:border-xedu-emerald-800', text: 'text-xedu-emerald-700 dark:text-xedu-emerald-300', dot: 'bg-xedu-emerald-500', defaultLabel: 'Faol' },
  inactive:   { bg: 'bg-xedu-slate-50 dark:bg-xedu-slate-800/40', border: 'border-xedu-slate-200 dark:border-xedu-slate-700', text: 'text-xedu-slate-500 dark:text-xedu-slate-400', dot: 'bg-xedu-slate-300', defaultLabel: 'Nofaol' },
  draft:      { bg: 'bg-xedu-slate-50 dark:bg-xedu-slate-800/40', border: 'border-xedu-slate-200 dark:border-xedu-slate-700', text: 'text-xedu-slate-500 dark:text-xedu-slate-400', dot: 'bg-xedu-slate-300', defaultLabel: 'Qoralama' },
  published:  { bg: 'bg-xedu-sky-50 dark:bg-xedu-sky-900/20', border: 'border-xedu-sky-200 dark:border-xedu-sky-800', text: 'text-xedu-sky-700 dark:text-xedu-sky-300', dot: 'bg-xedu-sky-500', defaultLabel: 'Chop etilgan' },
  resolved:   { bg: 'bg-xedu-emerald-50 dark:bg-xedu-emerald-900/20', border: 'border-xedu-emerald-200 dark:border-xedu-emerald-800', text: 'text-xedu-emerald-700 dark:text-xedu-emerald-300', dot: 'bg-xedu-emerald-500', defaultLabel: 'Hal qilingan' },
  unresolved: { bg: 'bg-xedu-ruby-50 dark:bg-xedu-ruby-900/20', border: 'border-xedu-ruby-200 dark:border-xedu-ruby-800', text: 'text-xedu-ruby-700 dark:text-xedu-ruby-300', dot: 'bg-xedu-ruby-500', defaultLabel: 'Hal qilinmagan' },
  paid:       { bg: 'bg-xedu-emerald-50 dark:bg-xedu-emerald-900/20', border: 'border-xedu-emerald-200 dark:border-xedu-emerald-800', text: 'text-xedu-emerald-700 dark:text-xedu-emerald-300', dot: 'bg-xedu-emerald-500', defaultLabel: 'To\'langan' },
  overdue:    { bg: 'bg-xedu-ruby-50 dark:bg-xedu-ruby-900/20', border: 'border-xedu-ruby-200 dark:border-xedu-ruby-800', text: 'text-xedu-ruby-700 dark:text-xedu-ruby-300', dot: 'bg-xedu-ruby-500', defaultLabel: 'Muddati o\'tgan' },
  failed:     { bg: 'bg-xedu-ruby-50 dark:bg-xedu-ruby-900/20', border: 'border-xedu-ruby-200 dark:border-xedu-ruby-800', text: 'text-xedu-ruby-700 dark:text-xedu-ruby-300', dot: 'bg-xedu-ruby-500', defaultLabel: 'Muvaffaqiyatsiz' },
  approved:   { bg: 'bg-xedu-emerald-50 dark:bg-xedu-emerald-900/20', border: 'border-xedu-emerald-200 dark:border-xedu-emerald-800', text: 'text-xedu-emerald-700 dark:text-xedu-emerald-300', dot: 'bg-xedu-emerald-500', defaultLabel: 'Tasdiqlangan' },
  rejected:   { bg: 'bg-xedu-ruby-50 dark:bg-xedu-ruby-900/20', border: 'border-xedu-ruby-200 dark:border-xedu-ruby-800', text: 'text-xedu-ruby-700 dark:text-xedu-ruby-300', dot: 'bg-xedu-ruby-500', defaultLabel: 'Rad etilgan' },
};

export function StatusBadge({ variant, label, dot = false, className }: StatusBadgeProps) {
  const cfg = variantConfig[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-2xs font-semibold whitespace-nowrap',
        cfg.bg,
        cfg.border,
        cfg.text,
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />}
      {label ?? cfg.defaultLabel}
    </span>
  );
}

/* ── Compact dot-only variant ──────────────────────────────────────────────── */

interface StatusDotProps {
  variant: StatusVariant;
  size?: 'sm' | 'md';
  pulse?: boolean;
  label?: string;
  className?: string;
}

const dotSizeClass = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2.5 w-2.5',
};

export function StatusDot({ variant, size = 'sm', pulse = false, label, className }: StatusDotProps) {
  const cfg = variantConfig[variant];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('relative flex rounded-full', dotSizeClass[size])}>
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75', cfg.dot, pulse && 'animate-ping')} />
        <span className={cn('relative inline-flex rounded-full', dotSizeClass[size], cfg.dot)} />
      </span>
      {label && <span className={cn('text-2xs font-medium', cfg.text)}>{label}</span>}
    </span>
  );
}
