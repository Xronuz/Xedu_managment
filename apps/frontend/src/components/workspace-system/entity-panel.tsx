'use client';

import { useState, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  X, User, Building2, GraduationCap, Wallet, FileText,
  Clock, CheckCircle2, AlertTriangle, TrendingUp,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   ENTITY PANEL SYSTEM
   Generic contextual panel for any entity type.

   Supports:
   - Branch
   - Student
   - Teacher / Staff
   - Parent
   - Payment / Invoice
   - Class
   - Lead
   - Leave Request

   Structure:
   - Header: entity name, type badge, status, close
   - Overview: key metrics
   - Tabs: details, related records, activity, audit
   - Actions: contextual quick actions

   Never modal-heavy. Preserves workspace continuity.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type EntityType =
  | 'branch'
  | 'student'
  | 'teacher'
  | 'staff'
  | 'parent'
  | 'payment'
  | 'class'
  | 'lead'
  | 'leave-request'
  | 'discipline'
  | 'default';

export interface EntityPanelProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  title: string;
  subtitle?: string;
  status?: 'active' | 'inactive' | 'pending' | 'resolved' | 'open' | 'overdue' | 'paid';
  avatar?: React.ReactNode;
  metrics?: { label: string; value: string | number; tone?: 'calm' | 'attention' | 'urgent' | 'success' }[];
  tabs?: { id: string; label: string; content: React.ReactNode }[];
  actions?: React.ReactNode;
  activity?: { label: string; value: string; timestamp?: string; tone?: 'calm' | 'attention' | 'urgent' | 'success' }[];
  className?: string;
}

const ENTITY_CONFIG: Record<EntityType, { icon: React.ElementType; label: string; color: string }> = {
  branch:       { icon: Building2, label: 'Filial', color: 'text-xedu-primary' },
  student:      { icon: GraduationCap, label: "O'quvchi", color: 'text-xedu-sky' },
  teacher:      { icon: User, label: "O'qituvchi", color: 'text-xedu-violet' },
  staff:        { icon: User, label: 'Xodim', color: 'text-xedu-slate-500' },
  parent:       { icon: User, label: 'Ota-ona', color: 'text-xedu-amber' },
  payment:      { icon: Wallet, label: "To'lov", color: 'text-xedu-primary' },
  class:        { icon: GraduationCap, label: 'Sinf', color: 'text-xedu-sky' },
  lead:         { icon: TrendingUp, label: 'Lid', color: 'text-xedu-gold' },
  'leave-request': { icon: FileText, label: "Ta'til", color: 'text-xedu-amber' },
  discipline:   { icon: AlertTriangle, label: 'Intizom', color: 'text-xedu-ruby' },
  default:      { icon: User, label: 'Ob\'ekt', color: 'text-xedu-slate-500' },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  active:   { label: 'Faol', dot: 'bg-xedu-primary', text: 'text-xedu-primary' },
  inactive: { label: 'Nofaol', dot: 'bg-xedu-slate-400', text: 'text-xedu-slate-500' },
  pending:  { label: 'Kutilmoqda', dot: 'bg-xedu-amber-500', text: 'text-xedu-amber-600' },
  resolved: { label: 'Hal etildi', dot: 'bg-xedu-primary', text: 'text-xedu-primary' },
  open:     { label: 'Ochiq', dot: 'bg-xedu-ruby-500', text: 'text-xedu-ruby-600' },
  overdue:  { label: 'Kechikkan', dot: 'bg-xedu-ruby-500', text: 'text-xedu-ruby-600' },
  paid:     { label: "To'landi", dot: 'bg-xedu-primary', text: 'text-xedu-primary' },
};

export function EntityPanel({
  open,
  onClose,
  entityType,
  title,
  subtitle,
  status,
  avatar,
  metrics,
  tabs,
  actions,
  activity,
  className,
}: EntityPanelProps) {
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id ?? '');
  const cfg = ENTITY_CONFIG[entityType] ?? ENTITY_CONFIG.default;
  const StatusIcon = cfg.icon;
  const statusCfg = status ? STATUS_CONFIG[status] : null;

  if (!open) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'var(--xedu-overlay)' }} onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full sm:w-[440px]',
          'bg-xedu-bg-elevated',
          'border-l border-xedu-slate-100 dark:border-xedu-slate-800',
          'shadow-2xl',
          'flex flex-col',
          className
        )}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {avatar ? (
                <div className="shrink-0">{avatar}</div>
              ) : (
                <div className="shrink-0 h-9 w-9 rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center">
                  <StatusIcon className={cn('h-4 w-4', cfg.color)} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100 leading-snug truncate">
                  {title}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400">
                    {cfg.label}
                  </span>
                  {subtitle && (
                    <>
                      <span className="text-xedu-slate-300">·</span>
                      <span className="text-xs text-xedu-slate-500 truncate">{subtitle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statusCfg && (
                <div className="flex items-center gap-1">
                  <div className={cn('h-2 w-2 rounded-full', statusCfg.dot)} />
                  <span className={cn('text-xs font-bold', statusCfg.text)}>{statusCfg.label}</span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Yopish"
                className="h-9 w-9 min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors"
              >
                <X className="h-5 w-5 text-xedu-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        {metrics && metrics.length > 0 && (
          <MetricsGrid metrics={metrics} />
        )}

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="shrink-0 flex items-center gap-0 px-5 border-b border-xedu-slate-100 dark:border-xedu-slate-800 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative px-3 py-2.5 text-xs font-bold transition-colors',
                  activeTab === tab.id
                    ? 'text-xedu-slate-900 dark:text-xedu-slate-100'
                    : 'text-xedu-slate-400 hover:text-xedu-slate-600 dark:hover:text-xedu-slate-300'
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-xedu-primary" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content — lazy tab rendering */}
        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {tabs && tabs.length > 0 ? (
            <TabContent tabs={tabs} activeTab={activeTab} />
          ) : (
            <div className="p-5">
              {activity && activity.length > 0 && (
                <ActivityFeed activity={activity} />
              )}
            </div>
          )}
        </div>

        {/* Actions footer */}
        {actions && (
          <div className="shrink-0 px-5 py-3 border-t border-xedu-slate-100 dark:border-xedu-slate-800">
            {actions}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Memoized sub-components ─────────────────────────────────────────────── */

const MetricsGrid = memo(function MetricsGrid({ metrics }: { metrics: EntityPanelProps['metrics'] }) {
  if (!metrics || metrics.length === 0) return null;
  return (
    <div className="shrink-0 px-5 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m, i) => (
          <div key={i} className="rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 px-2 py-1.5">
            <p className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400">{m.label}</p>
            <p className={cn(
              'text-sm font-bold tabular-nums',
              m.tone === 'urgent' ? 'text-xedu-ruby-600' :
              m.tone === 'attention' ? 'text-xedu-amber-600' :
              m.tone === 'success' ? 'text-xedu-primary' :
              'text-xedu-slate-800 dark:text-xedu-slate-200'
            )}>
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

const TabContent = memo(function TabContent({ tabs, activeTab }: { tabs: NonNullable<EntityPanelProps['tabs']>; activeTab: string }) {
  const active = tabs.find((t) => t.id === activeTab);
  if (!active) return null;
  return <div key={activeTab}>{active.content}</div>;
});

const ActivityFeed = memo(function ActivityFeed({ activity }: { activity: NonNullable<EntityPanelProps['activity']> }) {
  return (
    <div className="space-y-0">
      <p className="text-2xs font-bold uppercase tracking-[0.12em] text-xedu-slate-400 mb-2">
        Faollik tarixi
      </p>
      <div className="relative space-y-0">
        <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-xedu-slate-100 dark:bg-xedu-slate-800" />
        {activity.map((evt, idx) => (
          <TimelineRow key={idx} event={evt} />
        ))}
      </div>
    </div>
  );
});

const TimelineRow = memo(function TimelineRow({ event }: { event: { label: string; value: string; timestamp?: string; tone?: 'calm' | 'attention' | 'urgent' | 'success' } }) {
  const dotColor = {
    calm: 'bg-xedu-slate-300',
    attention: 'bg-xedu-amber-500',
    urgent: 'bg-xedu-ruby-500',
    success: 'bg-xedu-primary',
  }[event.tone ?? 'calm'];

  return (
    <div className="relative flex items-start gap-3 py-2">
      <div className={cn('h-[11px] w-[11px] rounded-full border-2 border-white dark:border-xedu-slate-900 shrink-0 mt-0.5 z-[1]', dotColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-xedu-slate-800 dark:text-xedu-slate-200">{event.label}</p>
        <p className="text-xs text-xedu-slate-500">{event.value}</p>
        {event.timestamp && (
          <p className="text-2xs text-xedu-slate-400 mt-0.5 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {event.timestamp}
          </p>
        )}
      </div>
    </div>
  );
});
