'use client';

import {
  BarChart3, Calendar, AlertTriangle, Activity, CheckCircle2,
  Info, ArrowRight, Clock, ShieldAlert, TrendingDown, Zap,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface IntelligenceFeedProps {
  aiSummary?: {
    riskDistribution?: { critical?: number; high?: number; medium?: number; low?: number };
    totalStudents?: number;
    averages?: { gpa?: number; attendance?: number };
    topAtRisk?: any[];
  } | null;
  pendingLeaves?: any[];
  pendingDiscipline?: any[];
  attendanceSummary?: {
    presentPct?: number;
    totalStudents?: number;
    marked?: number;
  } | null;
  branches?: any[];
  upcomingExams?: number;
  isLoading: boolean;
}

export function IntelligenceFeed({
  aiSummary,
  pendingLeaves = [],
  pendingDiscipline = [],
  attendanceSummary,
  branches = [],
  upcomingExams = 0,
  isLoading,
}: IntelligenceFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeedHeader title="Operatsion oqim" icon={Zap} />
        <div className="space-y-0 border border-xedu-slate-100 dark:border-xedu-slate-800 rounded-xl overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  // ── Build operational sections ─────────────────────────────────────────────
  const critical = aiSummary?.riskDistribution?.critical ?? 0;
  const high = aiSummary?.riskDistribution?.high ?? 0;
  const atRisk = critical + high;

  const totalPending = pendingLeaves.length + pendingDiscipline.length;
  const presentPct = attendanceSummary?.presentPct ?? 0;

  // Section: Attention Required
  const attentionItems: StreamItem[] = [];
  if (totalPending > 0) {
    attentionItems.push({
      id: 'pending-leaves',
      priority: 'high',
      title: `${pendingLeaves.length} ta ta'til so'rovi kutilmoqda`,
      meta: "Tasdiqlash talab etiladi",
      href: '/dashboard/leave-requests',
      action: "Ko'rish",
    });
  }
  if (pendingDiscipline.length > 0) {
    attentionItems.push({
      id: 'pending-discipline',
      priority: 'high',
      title: `${pendingDiscipline.length} ta intizom holati hal etilmagan`,
      meta: 'Tezkor yechim talab etiladi',
      href: '/dashboard/discipline',
      action: "Ko'rish",
    });
  }
  if (presentPct > 0 && presentPct < 75) {
    attentionItems.push({
      id: 'low-attendance',
      priority: 'medium',
      title: `Davomat pasaydi: ${presentPct}%`,
      meta: `${attendanceSummary?.totalStudents ?? 0} ta o'quvchidan`,
      href: '/dashboard/attendance',
      action: 'Tahlil',
    });
  }

  // Section: AI / Risk Signals
  const riskItems: StreamItem[] = [];
  if (atRisk > 0) {
    riskItems.push({
      id: 'at-risk',
      priority: critical > 0 ? 'critical' : 'high',
      title: `${atRisk} ta o'quvchi xavf ostida`,
      meta: critical > 0 ? `${critical} ta kritik holat` : `${high} ta yuqori xavf`,
      href: '/dashboard/ai-analytics',
      action: 'Tahlil',
    });
  }
  if (aiSummary?.averages?.gpa != null && aiSummary.averages.gpa < 60) {
    riskItems.push({
      id: 'low-gpa',
      priority: 'medium',
      title: `O'rtacha GPA pas: ${aiSummary.averages.gpa.toFixed(1)}`,
      meta: "Akademik qo'llab-quvvatlash zarur",
      href: '/dashboard/ai-analytics',
      action: 'Tahlil',
    });
  }

  // Section: Operational Events
  const eventItems: StreamItem[] = [];
  if (upcomingExams > 0) {
    eventItems.push({
      id: 'upcoming-exams',
      priority: 'low',
      title: `${upcomingExams} ta imtihon yaqinlashmoqda`,
      meta: 'Keyingi 7 kun ichida',
      href: '/dashboard/exams',
      action: 'Jadval',
    });
  }
  if ((branches as any[]).length > 1) {
    eventItems.push({
      id: 'branches-active',
      priority: 'low',
      title: `${branches.length} ta filial faol`,
      meta: 'Umumiy monitoring davom etmoqda',
      href: '/dashboard/branches',
    });
  }

  // Section: This Week
  const today = new Date();
  const dayLabel = today.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const weekItems: StreamItem[] = [
    {
      id: 'today',
      priority: 'low',
      title: 'Bugun',
      meta: dayLabel,
    },
  ];

  return (
    <div className="space-y-3">
      <FeedHeader title="Operatsion oqim" icon={Zap} />

      {/* Attention Required */}
      {attentionItems.length > 0 && (
        <FeedSection title="Diqqat talab" tone="urgent">
          {attentionItems.map((item) => (
            <StreamRow key={item.id} item={item} />
          ))}
        </FeedSection>
      )}

      {/* Risk Signals */}
      {riskItems.length > 0 && (
        <FeedSection title="Xavf signallari" tone="risk">
          {riskItems.map((item) => (
            <StreamRow key={item.id} item={item} />
          ))}
        </FeedSection>
      )}

      {/* Operational Events */}
      {eventItems.length > 0 && (
        <FeedSection title="Operatsion hodisalar" tone="neutral">
          {eventItems.map((item) => (
            <StreamRow key={item.id} item={item} />
          ))}
        </FeedSection>
      )}

      {/* This Week */}
      <FeedSection title="Hafta ko'rinishi" tone="neutral">
        {weekItems.map((item) => (
          <StreamRow key={item.id} item={item} />
        ))}
      </FeedSection>

      {/* Empty state */}
      {attentionItems.length === 0 && riskItems.length === 0 && eventItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 border border-xedu-slate-100 dark:border-xedu-slate-800 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-xedu-primary" />
          <p className="text-sm text-xedu-slate-500">Barcha ko'rsatkichlar normal</p>
        </div>
      )}
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface StreamItem {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  meta: string;
  href?: string;
  action?: string;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FeedHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-xedu-slate-500" />
        <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{title}</h3>
      </div>
    </div>
  );
}

function FeedSection({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'urgent' | 'risk' | 'neutral';
  children: React.ReactNode;
}) {
  const accentColor =
    tone === 'urgent' ? 'bg-xedu-ruby-500' : tone === 'risk' ? 'bg-xedu-amber-500' : 'bg-xedu-slate-300';

  return (
    <div className="border border-xedu-slate-100 dark:border-xedu-slate-800 rounded-xl overflow-hidden bg-xedu-bg-elevated">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-slate-50/30 dark:bg-xedu-slate-800">
        <div className={cn('h-1.5 w-1.5 rounded-full', accentColor)} />
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-xedu-slate-500">{title}</p>
      </div>
      <div className="border-t border-xedu-slate-100 dark:border-xedu-slate-800">{children}</div>
    </div>
  );
}

function StreamRow({ item }: { item: StreamItem }) {
  const { priority, title, meta, href, action } = item;

  const priorityIcon = {
    critical: AlertTriangle,
    high: AlertTriangle,
    medium: Clock,
    low: Activity,
  }[priority];
  const Icon = priorityIcon ?? Info;

  const priorityColor = {
    critical: 'text-xedu-ruby-500',
    high: 'text-xedu-amber-500',
    medium: 'text-xedu-slate-500',
    low: 'text-xedu-slate-400',
  }[priority];

  const priorityBg = {
    critical: 'bg-xedu-ruby-50 dark:bg-xedu-ruby-900/20',
    high: 'bg-xedu-amber-50 dark:bg-xedu-amber-900/20',
    medium: 'bg-xedu-slate-50 dark:bg-xedu-slate-800/40',
    low: 'transparent',
  }[priority];

  const Wrapper = href ? Link : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 transition-colors',
        href && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40 cursor-pointer',
        priorityBg
      )}
    >
      <Icon className={cn('h-3 w-3 shrink-0', priorityColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-xedu-slate-800 dark:text-xedu-slate-200 truncate leading-snug">
          {title}
        </p>
        <p className="text-xs text-xedu-slate-500 leading-snug">{meta}</p>
      </div>
      {href && action && (
        <div className="flex items-center gap-1 shrink-0 text-xs font-semibold text-xedu-primary">
          {action}
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      )}
    </Wrapper>
  );
}
