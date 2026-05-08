'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   ACTION SYSTEM
   Standardized action hierarchy for all operational pages.

   Hierarchy:
   - Primary: the most important action on the page
   - Secondary: supporting actions
   - Tertiary: subtle actions (text buttons)
   - Destructive: dangerous actions (delete, remove)
   - Bulk: contextual multi-select actions
   - Icon: compact icon-only actions

   Rules:
   - One primary per surface
   - Secondary actions never compete visually with primary
   - Destructive always requires confirmation or is visually subdued until hover
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Primary Action ─────────────────────────────────────────────────────────── */

interface PrimaryActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  icon?: React.ReactNode;
}

export function PrimaryAction({
  children,
  onClick,
  disabled,
  loading,
  type = 'button',
  className,
  icon,
}: PrimaryActionProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5',
        'rounded-lg px-3.5 py-2',
        'text-xs font-bold text-white',
        'bg-xedu-primary hover:bg-xedu-primary-hover active:bg-xedu-primary-active',
        'transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {!loading && icon}
      {children}
    </button>
  );
}

/* ── Secondary Action ───────────────────────────────────────────────────────── */

interface SecondaryActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function SecondaryAction({
  children,
  onClick,
  disabled,
  className,
  icon,
}: SecondaryActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5',
        'rounded-lg px-3 py-2',
        'text-xs font-bold text-xedu-slate-700 dark:text-xedu-slate-300',
        'border border-xedu-slate-200 dark:border-xedu-slate-700',
        'bg-white dark:bg-xedu-slate-900',
        'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800',
        'transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ── Tertiary Action ────────────────────────────────────────────────────────── */

interface TertiaryActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function TertiaryAction({
  children,
  onClick,
  disabled,
  className,
  icon,
}: TertiaryActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5',
        'rounded-lg px-2 py-1.5',
        'text-xs font-semibold text-xedu-slate-500',
        'hover:text-xedu-slate-800 dark:hover:text-xedu-slate-200',
        'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50',
        'transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ── Destructive Action ─────────────────────────────────────────────────────── */

interface DestructiveActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  confirm?: boolean;
}

export function DestructiveAction({
  children,
  onClick,
  disabled,
  className,
  icon,
}: DestructiveActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5',
        'rounded-lg px-3 py-2',
        'text-xs font-bold text-red-600',
        'border border-red-200 dark:border-red-900/30',
        'bg-white dark:bg-xedu-slate-900',
        'hover:bg-red-50 dark:hover:bg-red-900/20',
        'transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ── Icon Action ────────────────────────────────────────────────────────────── */

interface IconActionProps {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  tone?: 'neutral' | 'primary' | 'danger';
}

export function IconAction({
  icon,
  onClick,
  disabled,
  className,
  title,
  tone = 'neutral',
}: IconActionProps) {
  const toneClass = {
    neutral: 'text-xedu-slate-400 hover:text-xedu-slate-600 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800',
    primary: 'text-xedu-primary hover:bg-xedu-primary-light',
    danger: 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
  }[tone];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center justify-center',
        'h-7 w-7 rounded-md',
        'transition-colors',
        toneClass,
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
    >
      {icon}
    </button>
  );
}

/* ── Action Group ───────────────────────────────────────────────────────────── */

interface ActionGroupProps {
  children: React.ReactNode;
  className?: string;
  separated?: boolean;
}

export function ActionGroup({ children, className, separated = false }: ActionGroupProps) {
  return (
    <div
      className={cn(
        'flex items-center',
        separated && 'divide-x divide-xedu-slate-200 dark:divide-xedu-slate-700',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Action Bar (page-level) ────────────────────────────────────────────────── */

interface ActionBarProps {
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
  className?: string;
}

export function ActionBar({ primary, secondary, tertiary, className }: ActionBarProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {primary && <div className="flex items-center gap-2">{primary}</div>}
      {secondary && (
        <div className="flex items-center gap-2 border-l border-xedu-slate-200 dark:border-xedu-slate-700 pl-2">
          {secondary}
        </div>
      )}
      {tertiary && (
        <div className="flex items-center gap-1 border-l border-xedu-slate-200 dark:border-xedu-slate-700 pl-2">
          {tertiary}
        </div>
      )}
    </div>
  );
}

/* ── Contextual Action Menu Trigger ─────────────────────────────────────────── */

interface ContextualActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function ContextualActions({ children, className }: ContextualActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800',
        'bg-white dark:bg-xedu-slate-900 px-1 py-0.5 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
