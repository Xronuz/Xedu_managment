'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   WORKSPACE HELPERS
   Standardized sub-components used across all operational workspaces.

   These eliminate duplication and ensure institutional consistency
   in spacing, typography, surfaces, and interaction patterns.
   ═══════════════════════════════════════════════════════════════════════════════ */

// ── Stat Pill ─────────────────────────────────────────────────────────────────
// Compact metric display for sidebars and intelligence panels.

export type StatTone = 'calm' | 'success' | 'urgent' | 'attention';

interface StatPillProps {
  label: string;
  value: string | number;
  suffix?: string;
  tone?: StatTone;
}

export function StatPill({ label, value, suffix = '', tone = 'calm' }: StatPillProps) {
  const color: Record<StatTone, string> = {
    calm:      'text-xedu-slate-800 dark:text-xedu-slate-200',
    success:   'text-xedu-primary',
    urgent:    'text-red-600',
    attention: 'text-amber-600',
  };

  return (
    <div className="rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 px-2.5 py-2">
      <p className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400">{label}</p>
      <p className={cn('text-sm font-bold tabular-nums truncate', color[tone])}>
        {value}{suffix}
      </p>
    </div>
  );
}

// ── Quick Link ────────────────────────────────────────────────────────────────
// Sidebar navigation link with consistent hover and arrow treatment.

interface QuickLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
}

export function QuickLink({ href, icon: Icon, label }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-xedu-slate-600 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
    >
      <Icon className="h-3.5 w-3.5 text-xedu-slate-400" />
      {label}
      <ArrowRight className="h-3 w-3 ml-auto text-xedu-slate-300" />
    </Link>
  );
}

// ── Info Item ─────────────────────────────────────────────────────────────────
// Label-value pair with icon, used in entity panels and detail views.

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

export function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 px-2.5 py-2">
      <Icon className="h-3.5 w-3.5 text-xedu-slate-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400">{label}</p>
        <p className="text-xs font-medium text-xedu-slate-700 dark:text-xedu-slate-300 truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
// Calm, institutional empty state for tables and surfaces.

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-xedu-slate-500 dark:text-xedu-slate-400">
      <Icon className="h-8 w-8 text-xedu-slate-300" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-xedu-slate-400 max-w-xs text-center">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ── Loading Surface ───────────────────────────────────────────────────────────
// Institutional skeleton loader for dashboard surfaces.

interface LoadingSurfaceProps {
  rows?: number;
  columns?: number;
  showCards?: boolean;
}

export function LoadingSurface({ rows = 4, columns = 4, showCards = true }: LoadingSurfaceProps) {
  return (
    <div className="space-y-5 animate-pulse">
      {showCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(columns)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800/50" />
          ))}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800/50" />
        <div className="h-72 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800/50" />
      </div>
      <div className="h-48 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800/50" />
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
// Standardized section heading for chart groups and report sections.

interface SectionLabelProps {
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionLabel({ icon: Icon, children, action }: SectionLabelProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-xedu-slate-500 dark:text-xedu-slate-400/70">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {children}
      </h2>
      {action}
    </div>
  );
}
