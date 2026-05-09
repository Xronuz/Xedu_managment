'use client';

import { User, Building2, Calendar, Clock, FileText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

export interface AuditEvent {
  label: string;
  value: string;
  timestamp?: string;
  tone?: 'calm' | 'attention' | 'urgent' | 'success';
}

export interface AuditDetailPaneProps {
  title: string;
  subtitle?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'resolved' | 'open';
  requester?: {
    name: string;
    role?: string;
    avatar?: string;
  };
  branch?: string;
  source?: string;
  createdAt?: string;
  events: AuditEvent[];
  actions: React.ReactNode;
  empty?: boolean;
}

export function AuditDetailPane({
  title,
  subtitle,
  status,
  requester,
  branch,
  source,
  createdAt,
  events,
  actions,
  empty,
}: AuditDetailPaneProps) {
  if (empty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="h-8 w-8 text-xedu-slate-300 mx-auto mb-3" />
          <p className="text-sm text-xedu-slate-500">Element tanlang</p>
          <p className="text-xs text-xedu-slate-400 mt-1">Batafsil ma&apos;lumot ko&apos;rish uchun tanlang</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    pending:   { label: 'Kutilmoqda', dot: 'bg-xedu-amber-500', text: 'text-xedu-amber-600' },
    approved:  { label: 'Tasdiqlandi', dot: 'bg-xedu-primary', text: 'text-xedu-primary' },
    rejected:  { label: 'Rad etildi', dot: 'bg-xedu-ruby-500', text: 'text-xedu-ruby-600' },
    resolved:  { label: 'Hal etildi', dot: 'bg-xedu-primary', text: 'text-xedu-primary' },
    open:      { label: 'Ochiq', dot: 'bg-xedu-ruby-500', text: 'text-xedu-ruby-600' },
  };

  const cfg = status ? statusConfig[status] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100 leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-xedu-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {cfg && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={cn('h-2 w-2 rounded-full', cfg.dot)} />
              <span className={cn('text-[11px] font-bold', cfg.text)}>{cfg.label}</span>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {requester && (
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center">
                <User className="h-3 w-3 text-xedu-slate-500" />
              </div>
              <span className="text-[11px] text-xedu-slate-600 dark:text-xedu-slate-400">
                {requester.name}
                {requester.role && ` · ${requester.role}`}
              </span>
            </div>
          )}
          {branch && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-xedu-slate-400" />
              <span className="text-[11px] text-xedu-slate-500">{branch}</span>
            </div>
          )}
          {createdAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-xedu-slate-400" />
              <span className="text-[11px] text-xedu-slate-500">{formatDate(createdAt)}</span>
            </div>
          )}
          {source && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-xedu-slate-400" />
              <span className="text-[11px] text-xedu-slate-500">{source}</span>
            </div>
          )}
        </div>
      </div>

      {/* Events timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-xedu-slate-400 mb-3">
          Hodisalar tarixi
        </p>
        <div className="space-y-0 relative">
          {/* Vertical line */}
          <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-xedu-slate-100 dark:bg-xedu-slate-800" />

          {events.map((event, idx) => (
            <TimelineRow key={idx} event={event} />
          ))}

          {events.length === 0 && (
            <p className="text-xs text-xedu-slate-400 py-2">Ma&apos;lumot mavjud emas</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {actions && (
        <div className="px-5 py-3 border-t border-xedu-slate-100 dark:border-xedu-slate-800">
          {actions}
        </div>
      )}
    </div>
  );
}

function TimelineRow({ event }: { event: AuditEvent }) {
  const { label, value, timestamp, tone = 'calm' } = event;

  const dotColor = {
    calm: 'bg-xedu-slate-300',
    attention: 'bg-xedu-amber-500',
    urgent: 'bg-xedu-ruby-500',
    success: 'bg-xedu-primary',
  }[tone];

  return (
    <div className="relative flex items-start gap-3 py-2">
      <div className={cn('h-[11px] w-[11px] rounded-full border-2 border-white dark:border-xedu-slate-900 shrink-0 mt-0.5 z-[1]', dotColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-xedu-slate-800 dark:text-xedu-slate-200">{label}</p>
        <p className="text-[11px] text-xedu-slate-500 mt-0.5">{value}</p>
        {timestamp && (
          <p className="text-[10px] text-xedu-slate-400 mt-0.5 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatDate(timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}
