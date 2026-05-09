'use client';

import { useMemo } from 'react';
import {
  Clock, FileText, ShieldAlert, CheckCircle2, TrendingDown,
  Calendar, AlertTriangle, Brain, Wallet, UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════════
   ACTIVITY STREAM — Institutional operations audit feed
   Derived from existing data. NOT a social feed.
   ═══════════════════════════════════════════════════════════════════════════════ */

type ActivityTone = 'neutral' | 'attention' | 'urgent' | 'success';

interface ActivityItem {
  id: string;
  timestamp: string;
  icon: React.ElementType;
  tone: ActivityTone;
  title: string;
  detail: string;
  actor?: string;
  href?: string;
}

interface ActivityStreamProps {
  pendingLeaves?: any[];
  pendingDiscipline?: any[];
  attendanceSummary?: { presentPct?: number; totalStudents?: number } | null;
  branches?: any[];
  aiSummary?: { riskDistribution?: { critical?: number; high?: number } } | null;
  financeData?: { overdueAmount?: number; pendingAmount?: number } | null;
  upcomingExams?: any[];
  maxItems?: number;
}

export function ActivityStream({
  pendingLeaves = [],
  pendingDiscipline = [],
  attendanceSummary,
  branches = [],
  aiSummary,
  financeData,
  upcomingExams = [],
  maxItems = 12,
}: ActivityStreamProps) {
  const items = useMemo(() => {
    const activities: ActivityItem[] = [];

    // 1. Pending leave requests (newest first)
    pendingLeaves.slice(0, 3).forEach((l: any) => {
      activities.push({
        id: `leave-${l.id}`,
        timestamp: l.createdAt,
        icon: FileText,
        tone: 'attention',
        title: `Ta'til so'rovi yuborildi`,
        detail: `${l.requester?.firstName ?? ''} ${l.requester?.lastName ?? ''} — ${l.reason ?? ''}`.trim(),
        actor: l.requester?.branch?.name,
        href: '/dashboard/approvals',
      });
    });

    // 2. Unresolved discipline
    pendingDiscipline.slice(0, 3).forEach((d: any) => {
      activities.push({
        id: `disc-${d.id}`,
        timestamp: d.createdAt,
        icon: ShieldAlert,
        tone: d.severity === 'high' ? 'urgent' : 'attention',
        title: `Intizom holati ${d.severity === 'high' ? '(jiddiy)' : ''}`,
        detail: `${d.student?.firstName ?? ''} ${d.student?.lastName ?? ''} — ${d.type}`,
        actor: d.reportedBy ? `${d.reportedBy.firstName} ${d.reportedBy.lastName}` : undefined,
        href: '/dashboard/discipline',
      });
    });

    // 3. Attendance alert (if low)
    const pct = attendanceSummary?.presentPct ?? 0;
    if (pct > 0 && pct < 75) {
      activities.push({
        id: 'att-alert',
        timestamp: new Date().toISOString(),
        icon: TrendingDown,
        tone: 'urgent',
        title: 'Davomat pasaydi',
        detail: `Maktab bo'ylab davomat ${pct}% — normaldan past`,
        href: '/dashboard/attendance',
      });
    }

    // 4. Finance alerts
    const overdue = financeData?.overdueAmount ?? 0;
    if (overdue > 0) {
      activities.push({
        id: 'finance-overdue',
        timestamp: new Date().toISOString(),
        icon: Wallet,
        tone: 'urgent',
        title: 'Kechikkan to\'lovlar mavjud',
        detail: `Kechikkan summa: ${overdue.toLocaleString()} UZS`,
        href: '/dashboard/finance',
      });
    }

    // 5. AI risk updates
    const criticalRisk = aiSummary?.riskDistribution?.critical ?? 0;
    if (criticalRisk > 0) {
      activities.push({
        id: 'ai-risk',
        timestamp: new Date().toISOString(),
        icon: Brain,
        tone: 'urgent',
        title: 'AI xavf signali yangilandi',
        detail: `${criticalRisk} ta o'quvchi kritik xavf ostida`,
        href: '/dashboard/ai-analytics',
      });
    }

    // 6. Upcoming exams
    upcomingExams.slice(0, 2).forEach((e: any, idx: number) => {
      activities.push({
        id: `exam-${e.id ?? idx}`,
        timestamp: e.date ?? e.startDate ?? new Date().toISOString(),
        icon: Calendar,
        tone: 'neutral',
        title: 'Imtihon yaqinlashmoqda',
        detail: e.title ?? e.name ?? e.subject?.name ?? 'Imtihon',
        href: '/dashboard/exams',
      });
    });

    // 7. Branch status
    branches.forEach((b: any) => {
      if (!b.isActive) {
        activities.push({
          id: `branch-inactive-${b.id}`,
          timestamp: b.updatedAt ?? new Date().toISOString(),
          icon: UserMinus,
          tone: 'attention',
          title: 'Filial nofaol holatda',
          detail: b.name,
          href: '/dashboard/branches',
        });
      }
    });

    // Sort by timestamp desc
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems);
  }, [pendingLeaves, pendingDiscipline, attendanceSummary, branches, aiSummary, financeData, upcomingExams, maxItems]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-xedu-slate-400 mb-3">Operatsion faollik</p>
        <div className="flex flex-col items-center py-6 gap-2">
          <CheckCircle2 className="h-5 w-5 text-xedu-slate-300" />
          <p className="text-sm text-xedu-slate-500">So'nggi faollik yo'q</p>
        </div>
      </div>
    );
  }

  // Group by relative time
  const grouped = groupByTime(items);

  return (
    <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-xedu-slate-400">Operatsion faollik</p>
        <span className="text-[10px] font-medium text-xedu-slate-400">{items.length} ta hodisa</span>
      </div>
      <div className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800 max-h-[360px] overflow-y-auto">
        {grouped.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1.5 bg-xedu-slate-50/50 dark:bg-xedu-slate-800/20">
              <span className="text-[9px] font-bold uppercase tracking-wider text-xedu-slate-400">{group.label}</span>
            </div>
            {group.items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const { icon: Icon, tone, title, detail, actor, href } = item;

  const toneColor = {
    neutral: 'text-xedu-slate-400',
    attention: 'text-xedu-amber-500',
    urgent: 'text-xedu-ruby-500',
    success: 'text-xedu-primary',
  }[tone];

  const bgColor = {
    neutral: 'transparent',
    attention: 'bg-xedu-amber-50/50 dark:bg-xedu-amber-900/10',
    urgent: 'bg-xedu-ruby-50/50 dark:bg-xedu-ruby-900/10',
    success: 'bg-xedu-primary-light/20',
  }[tone];

  const Wrapper = href ? Link : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'flex items-start gap-2 px-3 py-2 transition-colors',
        href && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30 cursor-pointer',
        bgColor
      )}
    >
      <Icon className={cn('h-3 w-3 shrink-0 mt-0.5', toneColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-xedu-slate-800 dark:text-xedu-slate-200 leading-snug">
          {title}
        </p>
        <p className="text-[11px] text-xedu-slate-500 truncate">{detail}</p>
        {actor && (
          <p className="text-[10px] text-xedu-slate-400 mt-0.5">{actor}</p>
        )}
      </div>
      <span className="text-[10px] text-xedu-slate-400 tabular-nums shrink-0 mt-0.5">
        {formatTimeAgo(item.timestamp)}
      </span>
    </Wrapper>
  );
}

// ── Time grouping ────────────────────────────────────────────────────────────

function groupByTime(items: ActivityItem[]): { label: string; items: ActivityItem[] }[] {
  const now = Date.now();
  const groups: { label: string; items: ActivityItem[] }[] = [];

  const buckets = [
    { label: 'So\'nggi soat', ms: 3600000 },
    { label: 'Bugun', ms: 86400000 },
    { label: 'Kecha', ms: 172800000 },
    { label: 'So\'nggi hafta', ms: 604800000 },
    { label: 'Avvalgi', ms: Infinity },
  ];

  const used = new Set<string>();

  for (const bucket of buckets) {
    const bucketItems = items.filter((item) => {
      if (used.has(item.id)) return false;
      const diff = now - new Date(item.timestamp).getTime();
      const prevMs = buckets[buckets.indexOf(bucket) - 1]?.ms ?? 0;
      if (diff <= bucket.ms && diff > prevMs) {
        used.add(item.id);
        return true;
      }
      if (bucket.ms === Infinity && !used.has(item.id)) {
        used.add(item.id);
        return true;
      }
      return false;
    });
    if (bucketItems.length > 0) {
      groups.push({ label: bucket.label, items: bucketItems });
    }
  }

  return groups;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hozir';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
