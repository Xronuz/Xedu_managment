'use client';

/**
 * Xedu Premium UI System
 * Shared building blocks for every dashboard page.
 * DNA: Linear + Stripe + Notion — white, clean, primary accents.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Skeleton } from './skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from './dialog';

// ─── Design tokens ────────────────────────────────────────────────────────────
export const DS = {
  primary:      'var(--xedu-primary)',
  primaryLight: 'var(--xedu-primary-light)',
  text:         'var(--xedu-text)',
  muted:        'var(--xedu-text-muted)',
  border:       'var(--xedu-border)',
  shadow:       'var(--xedu-shadow-floating)',
  bg:           'var(--xedu-bg)',
} as const;

// ─── PageShell ────────────────────────────────────────────────────────────────
/** Root wrapper for every page — consistent top padding + vertical stack */
export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-6 pb-10', className)}>
      {children}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight leading-tight truncate text-xedu-slate-900 dark:text-xedu-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] mt-0.5 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── PCard ────────────────────────────────────────────────────────────────────
/** Premium white card — same DNA as dashboard cards */
interface PCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hoverable?: boolean;
  onClick?: () => void;
}
export function PCard({ children, className, style, padding = 'md', hoverable, onClick }: PCardProps) {
  const pad = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-7' }[padding];
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[24px] bg-xedu-bg-elevated dark:bg-xedu-slate-800/50',
        pad,
        hoverable && 'cursor-pointer transition-all duration-150 hover:-translate-y-[2px] hover:shadow-md',
        className,
      )}
      style={{ border: '1px solid var(--xedu-border)', boxShadow: DS.shadow, ...style }}
    >
      {children}
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
interface FilterBarProps {
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}
export function FilterBar({ search, onSearch, searchPlaceholder = 'Qidiruv...', filters, actions, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onSearch !== undefined && (
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-xedu-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search ?? ''}
            onChange={e => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-[42px] pl-10 pr-4 text-[13px] rounded-[14px] outline-none transition-all bg-xedu-bg text-xedu-text"
            style={{
              border: '1px solid var(--xedu-border)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--xedu-primary)'; e.currentTarget.style.boxShadow = 'var(--xedu-shadow-glow-primary)'; }}
            onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--xedu-border)';   e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
      )}
      {filters}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Btn ─────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  asChild?: boolean;
}
export function Btn({
  variant = 'secondary', size = 'md', icon, loading, children, className, disabled, asChild: _asChild, ...rest
}: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-[14px] transition-all duration-150 select-none';
  const sizes = { sm: 'h-8 px-3 text-[12px]', md: 'h-[42px] px-4 text-[13px]', lg: 'h-12 px-6 text-[14px]' };
  const variants: Record<BtnVariant, string> = {
    primary:   'bg-xedu-primary text-white hover:bg-xedu-primary-hover active:scale-[0.98] shadow-sm',
    secondary: 'bg-xedu-bg-elevated dark:bg-xedu-slate-800 text-xedu-slate-700 dark:text-xedu-slate-200 border border-xedu-border dark:border-white/[0.08] hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-700 hover:border-xedu-border-hover dark:hover:border-white/[0.12]',
    ghost:     'bg-transparent text-xedu-slate-600 dark:text-xedu-slate-300 hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800',
    danger:    'bg-xedu-ruby/10 dark:bg-xedu-ruby/15 text-xedu-ruby dark:text-xedu-ruby border border-xedu-ruby/15 dark:border-xedu-ruby/25 hover:bg-xedu-ruby/15 dark:hover:bg-xedu-ruby/20',
    soft:      'bg-xedu-primary-light dark:bg-xedu-primary/20 text-xedu-primary dark:text-xedu-primary hover:bg-xedu-primary-muted dark:hover:bg-xedu-primary/30',
  };
  return (
    <button
      className={cn(base, sizes[size], variants[variant], (disabled || loading) && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading
        ? <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        : icon}
      {children}
    </button>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'violet';
const STATUS_CLASSES: Record<StatusVariant, string> = {
  success: 'bg-xedu-primary-light dark:bg-xedu-primary/20 text-xedu-primary dark:text-xedu-primary',
  warning: 'bg-xedu-amber/10 dark:bg-xedu-amber/15 text-xedu-amber dark:text-xedu-amber',
  danger:  'bg-xedu-ruby/10 dark:bg-xedu-ruby/15 text-xedu-ruby dark:text-xedu-ruby',
  info:    'bg-xedu-sky/10 dark:bg-xedu-sky/15 text-xedu-sky dark:text-xedu-sky',
  neutral: 'bg-xedu-slate-100 dark:bg-xedu-slate-700 text-xedu-slate-600 dark:text-xedu-slate-300',
  violet:  'bg-xedu-violet/10 dark:bg-xedu-violet/15 text-xedu-violet dark:text-xedu-violet',
};
interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  className?: string;
}
export function StatusBadge({ variant = 'neutral', children, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', STATUS_CLASSES[variant], className)}>
      {children}
    </span>
  );
}

// ─── TableShell ───────────────────────────────────────────────────────────────
/** Wraps a standard HTML table with premium rounded container */
export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <PCard padding="none" className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          {children}
        </table>
      </div>
    </PCard>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-xedu-border dark:border-white/[0.06] bg-xedu-slate-50 dark:bg-xedu-slate-800/60">
        {children}
      </tr>
    </thead>
  );
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap text-xedu-slate-500 dark:text-xedu-slate-400', className)}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-black/[0.04] dark:border-white/[0.05] transition-colors duration-[var(--xedu-duration)]',
        onClick && 'cursor-pointer hover:bg-xedu-slate-50/80 dark:hover:bg-xedu-slate-700/30',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-5 py-3.5 align-middle text-xedu-slate-900 dark:text-xedu-slate-100', className)}>
      {children}
    </td>
  );
}

// ─── Avatar initials ──────────────────────────────────────────────────────────
const AV_COLORS = [
  ['#DDF5EA','#0F7B53'],['#DBEAFE','#2563EB'],['#EDE9FE','#7C3AED'],
  ['#FEF3C7','#D97706'],['#CFFAFE','#0891B2'],['#FFE4E6','#E11D48'],
];
export function AvatarCell({ name, subtitle, size = 36 }: { name: string; subtitle?: string; size?: number }) {
  const idx  = name.charCodeAt(0) % AV_COLORS.length;
  const [bg, fg] = AV_COLORS[idx];
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-xl shrink-0 flex items-center justify-center text-[12px] font-bold"
        style={{ width: size, height: size, background: bg, color: fg }}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="font-semibold truncate text-[13px] text-xedu-slate-900 dark:text-xedu-slate-100">{name}</p>
        {subtitle && <p className="text-[11px] truncate mt-0.5 text-xedu-slate-500 dark:text-xedu-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── EmptyCard ────────────────────────────────────────────────────────────────
interface EmptyCardProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
export function EmptyCard({ icon, title, description, action }: EmptyCardProps) {
  return (
    <PCard className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon
        ? <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-1 bg-xedu-primary-light dark:bg-xedu-primary/20">
            <span className="text-xedu-primary dark:text-xedu-primary">{icon}</span>
          </div>
        : <Inbox className="h-10 w-10 opacity-25 mb-1" />
      }
      <p className="font-semibold text-[15px] text-xedu-slate-800 dark:text-xedu-slate-200">{title}</p>
      {description && <p className="text-[13px] max-w-xs text-xedu-slate-500 dark:text-xedu-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </PCard>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onPage: (n: number) => void;
}
export function Pagination({ page, total, perPage, onPage }: PaginationProps) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-xedu-border">
      <p className="text-[12px] font-medium text-xedu-text-muted">
        {from}–{to} / {total} ta
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors hover:bg-xedu-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4 text-xedu-text-muted" />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = pages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? page : i === 4 ? pages - 2 : i === 5 ? pages - 1 : pages;
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={cn(
                'h-8 min-w-[32px] px-2 rounded-xl text-[12px] font-semibold transition-colors',
                p === page
                  ? 'bg-xedu-primary-light text-xedu-primary'
                  : 'text-xedu-text-muted bg-transparent hover:bg-xedu-slate-100'
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors hover:bg-xedu-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4 text-xedu-text-muted" />
        </button>
      </div>
    </div>
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────
/** Card with a title bar and optional action */
interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
export function SectionCard({ title, subtitle, action, children, className }: SectionCardProps) {
  return (
    <PCard padding="none" className={className}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-xedu-border">
        <div>
          <p className="font-bold text-[14px]" style={{ color: DS.text }}>{title}</p>
          {subtitle && <p className="text-[12px] mt-0.5" style={{ color: DS.muted }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </PCard>
  );
}

// ─── StatMini ────────────────────────────────────────────────────────────────
interface StatMiniProps { label: string; value: string | number; color?: string; bg?: string }
export function StatMini({ label, value, color = 'var(--xedu-text)', bg = 'var(--xedu-bg)' }: StatMiniProps) {
  return (
    <div className="rounded-2xl px-4 py-3 text-center" style={{ background: bg }}>
      <p className="text-[22px] font-black leading-none tracking-tight" style={{ color }}>{value}</p>
      <p className="text-[11px] font-semibold mt-1 uppercase tracking-wide text-xedu-text-muted">{label}</p>
    </div>
  );
}

// ─── TableSkeleton ────────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-xedu-slate-50 dark:divide-xedu-slate-800/40">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-3.5 w-1/3 max-w-[200px]" />
            <Skeleton className="h-3 w-1/4 max-w-[140px]" />
          </div>
          {Array.from({ length: cols - 2 }).map((_, j) => (
            <Skeleton key={j} className="h-3.5 w-16 shrink-0" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
/** Consistent form field wrapper with validation feedback */
interface FormFieldProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}
export function FormField({ label, required, helper, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300">
        {label}
        {required && <span className="text-xedu-ruby ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-xedu-ruby font-medium">{error}</p>
      ) : helper ? (
        <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{helper}</p>
      ) : null}
    </div>
  );
}

// ─── TableCard ────────────────────────────────────────────────────────────────
/** Standardized card wrapper for raw HTML tables */
export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <PCard padding="none" className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          {children}
        </table>
      </div>
    </PCard>
  );
}

// ─── TableEmpty ───────────────────────────────────────────────────────────────
/** Standardized empty state for tables and lists */
export function TableEmpty({ icon: Icon, title, description, action }: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon ? (
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3 bg-xedu-slate-50 dark:bg-xedu-slate-800/60">
          <Icon className="h-6 w-6 text-xedu-slate-400" />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-xedu-slate-700 dark:text-xedu-slate-300">{title}</p>
      {description && <p className="text-xs mt-1 text-xedu-slate-500 dark:text-xedu-slate-400 max-w-[260px]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── FormDialog ───────────────────────────────────────────────────────────────
/** Standardized dialog wrapper for modal forms */
export function FormDialog({
  open, onOpenChange, title, description, children, footer,
  maxWidth = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const maxW = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }[maxWidth];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxW, 'max-h-[90vh] overflow-y-auto')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        <DialogFooter className="gap-2 pt-2">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── IconBubble ──────────────────────────────────────────────────────────────
export function IconBubble({ icon, bg, color, size = 40 }: { icon: React.ReactNode; bg: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: bg, color }}
    >
      {icon}
    </div>
  );
}
