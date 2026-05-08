'use client';

import { BarChart3, Calendar, AlertTriangle, Activity, CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface IntelligenceItem {
  id: string;
  type: 'risk' | 'event' | 'alert' | 'insight' | 'activity';
  title: string;
  description?: string;
  timestamp?: string;
  href?: string;
  actionLabel?: string;
}

interface IntelligenceFeedProps {
  aiSummary?: {
    riskDistribution?: { critical?: number; high?: number; medium?: number; low?: number };
    totalStudents?: number;
    averages?: { gpa?: number; attendance?: number };
    topAtRisk?: any[];
  } | null;
  pendingLeaves?: any[];
  pendingDiscipline?: any[];
  recentEvents?: IntelligenceItem[];
  isLoading: boolean;
}

export function IntelligenceFeed({
  aiSummary,
  pendingLeaves = [],
  pendingDiscipline = [],
  recentEvents = [],
  isLoading,
}: IntelligenceFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeedHeader title="Intelligence" icon={BarChart3} />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Build feed items from available data
  const items: IntelligenceItem[] = [];

  // Risk signals
  const critical = aiSummary?.riskDistribution?.critical ?? 0;
  const high = aiSummary?.riskDistribution?.high ?? 0;
  const medium = aiSummary?.riskDistribution?.medium ?? 0;
  if (critical > 0 || high > 0) {
    items.push({
      id: 'risk-summary',
      type: 'risk',
      title: `Xavf ostida: ${critical + high} ta o'quvchi`,
      description: critical > 0 ? `${critical} ta kritik, ${high} ta yuqori xavf` : `${high} ta yuqori xavf`,
      href: '/dashboard/ai-analytics',
      actionLabel: 'Tahlil',
    });
  } else if (aiSummary?.totalStudents && aiSummary.totalStudents > 0) {
    items.push({
      id: 'risk-ok',
      type: 'insight',
      title: "Xavf signallari yo'q",
      description: `${aiSummary.totalStudents} ta o'quvchi monitoringda`,
      href: '/dashboard/ai-analytics',
    });
  }

  // Pending approvals
  const totalPending = (pendingLeaves?.length ?? 0) + (pendingDiscipline?.length ?? 0);
  if (totalPending > 0) {
    items.push({
      id: 'pending-approvals',
      type: 'alert',
      title: `${totalPending} ta tasdiqlash kutilmoqda`,
      description: pendingLeaves.length > 0 ? `${pendingLeaves.length} ta ta'til so'rovi` : `${pendingDiscipline.length} ta intizom holati`,
      href: pendingLeaves.length > 0 ? '/dashboard/leave-requests' : '/dashboard/discipline',
      actionLabel: "Ko'rish",
    });
  }

  // Academic averages
  const avgGpa = aiSummary?.averages?.gpa;
  const avgAtt = aiSummary?.averages?.attendance;
  if (avgGpa != null || avgAtt != null) {
    items.push({
      id: 'academic-avg',
      type: 'insight',
      title: "O'rtacha ko'rsatkichlar",
      description: [
        avgGpa != null ? `GPA: ${avgGpa.toFixed(1)}` : null,
        avgAtt != null ? `Davomat: ${avgAtt.toFixed(0)}%` : null,
      ].filter(Boolean).join(' · '),
      href: '/dashboard/education',
    });
  }

  // Recent events from prop
  recentEvents.forEach((ev) => items.push(ev));

  // Week at a glance fallback
  const today = new Date();
  const dayLabel = today.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });
  items.push({
    id: 'week-glance',
    type: 'activity',
    title: 'Bugun',
    description: dayLabel,
  });

  return (
    <div className="space-y-4">
      <FeedHeader title="Intelligence" icon={BarChart3} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Info className="h-5 w-5 text-xedu-slate-300" />
          <p className="text-sm text-xedu-slate-500">Hozircha ma&apos;lumot yo&apos;q</p>
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800 border border-xedu-slate-100 dark:border-xedu-slate-800 rounded-xl overflow-hidden bg-white dark:bg-xedu-slate-900">
          {items.map((item) => (
            <FeedRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon className="h-4 w-4 text-xedu-slate-500" />
      <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{title}</h3>
    </div>
  );
}

function FeedRow({ item }: { item: IntelligenceItem }) {
  const { type, title, description, href, actionLabel } = item;

  const iconMap: Record<string, React.ElementType> = {
    risk: AlertTriangle,
    alert: AlertTriangle,
    insight: Activity,
    event: Calendar,
    activity: CheckCircle2,
  };
  const Icon = iconMap[type] ?? Info;

  const iconColor =
    type === 'risk' || type === 'alert'
      ? 'text-amber-500'
      : type === 'insight'
      ? 'text-xedu-primary'
      : 'text-xedu-slate-400';

  const Wrapper = href ? Link : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors',
        href && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40 cursor-pointer'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-xedu-slate-800 dark:text-xedu-slate-200 truncate">{title}</p>
        {description && (
          <p className="text-[11px] text-xedu-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      {href && actionLabel && (
        <div className="flex items-center gap-1 shrink-0 text-[11px] font-semibold text-xedu-primary">
          {actionLabel}
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </Wrapper>
  );
}
