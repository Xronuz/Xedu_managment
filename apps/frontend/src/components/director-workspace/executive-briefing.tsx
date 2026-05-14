'use client';

import { useMemo, memo } from 'react';
import {
  Lightbulb, ArrowRight, AlertTriangle, Clock,
  Users, TrendingDown, Wallet, Building2, BookOpen,
  CheckCircle2, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════════
   EXECUTIVE BRIEFING — "Bugungi tavsiya"
   Decision-guidance surface. The emotional + operational anchor of the page.

   Philosophy:
   - Answers: "What needs my attention right now?"
   - One clear sentence per item.
   - ONE primary action per item.
   - Calm, editorial, operational.
   - Severity is signal, not noise.
   - Emerald material depth for executive confidence.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type BriefingSeverity = 'critical' | 'attention' | 'suggestion' | 'calm';

export interface BriefingItem {
  id: string;
  severity: BriefingSeverity;
  icon: React.ElementType;
  message: string;
  actionLabel: string;
  href: string;
  metric?: string | number;
}

export interface ExecutiveBriefingData {
  pendingLeaves: any[];
  pendingDiscipline: any[];
  attendancePct: number | null;
  atRiskCount: number;
  overdueAmount: number;
  inactiveBranches: any[];
  teacherCount: number;
  studentCount: number;
  lowGpaCount?: number;
  upcomingExams: number;
}

interface ExecutiveBriefingProps {
  data: ExecutiveBriefingData;
}

export const ExecutiveBriefing = memo(function ExecutiveBriefing({ data }: ExecutiveBriefingProps) {
  const items = useMemo(() => {
    const briefs: BriefingItem[] = [];

    const {
      pendingLeaves,
      pendingDiscipline,
      attendancePct,
      atRiskCount,
      overdueAmount,
      inactiveBranches,
      teacherCount,
      studentCount,
      lowGpaCount = 0,
      upcomingExams,
    } = data;

    // 1. Critical: pending approvals backlog
    if (pendingLeaves.length > 0) {
      briefs.push({
        id: 'pending-leaves',
        severity: pendingLeaves.length > 3 ? 'critical' : 'attention',
        icon: Clock,
        message:
          pendingLeaves.length > 3
            ? `${pendingLeaves.length} ta ta'til so'rovi tasdiqlashni kutmoqda`
            : `${pendingLeaves.length} ta ta'til so'rovi ko'rib chiqishni talab etadi`,
        actionLabel: "Ko'rish",
        href: '/dashboard/approvals',
        metric: pendingLeaves.length,
      });
    }

    // 2. Critical: unresolved discipline
    if (pendingDiscipline.length > 0) {
      briefs.push({
        id: 'pending-discipline',
        severity: pendingDiscipline.length > 2 ? 'critical' : 'attention',
        icon: AlertTriangle,
        message: `${pendingDiscipline.length} ta intizom holati hal etilmagan`,
        actionLabel: 'Hal qilish',
        href: '/dashboard/discipline',
        metric: pendingDiscipline.length,
      });
    }

    // 3. Attention: low attendance
    if (attendancePct != null && attendancePct < 75) {
      briefs.push({
        id: 'low-attendance',
        severity: 'attention',
        icon: TrendingDown,
        message: `Maktab bo'ylab davomat pasaydi — ${attendancePct}%`,
        actionLabel: 'Tahlil',
        href: '/dashboard/attendance',
        metric: `${attendancePct}%`,
      });
    }

    // 4. Attention: at-risk students
    if (atRiskCount > 0) {
      briefs.push({
        id: 'at-risk',
        severity: atRiskCount > 5 ? 'critical' : 'attention',
        icon: Users,
        message: `${atRiskCount} ta o'quvchi xavf ostida`,
        actionLabel: 'Monitoring',
        href: '/dashboard/insights',
        metric: atRiskCount,
      });
    }

    // 5. Attention: overdue payments
    if (overdueAmount > 0) {
      briefs.push({
        id: 'overdue-payments',
        severity: 'attention',
        icon: Wallet,
        message: `${overdueAmount.toLocaleString()} so'm kechikkan to'lov mavjud`,
        actionLabel: 'Moliya',
        href: '/dashboard/finance',
        metric: `${overdueAmount.toLocaleString()} so'm`,
      });
    }

    // 6. Attention: inactive branches
    if (inactiveBranches.length > 0) {
      briefs.push({
        id: 'inactive-branches',
        severity: 'attention',
        icon: Building2,
        message: `${inactiveBranches.length} ta filial nofaol holatda`,
        actionLabel: 'Tekshirish',
        href: '/dashboard/branches',
        metric: inactiveBranches.length,
      });
    }

    // 7. Suggestion: high teacher load
    if (teacherCount > 0 && studentCount > 0) {
      const ratio = studentCount / teacherCount;
      if (ratio > 25) {
        briefs.push({
          id: 'teacher-load',
          severity: 'suggestion',
          icon: BookOpen,
          message: `O'qituvchi yuklamasi yuqori — har biriga ${Math.round(ratio)} ta o'quvchi`,
          actionLabel: 'Xodimlar',
          href: '/dashboard/staff',
          metric: `${Math.round(ratio)}:1`,
        });
      }
    }

    // 8. Suggestion: low GPA students
    if (lowGpaCount > 0) {
      briefs.push({
        id: 'low-gpa',
        severity: 'suggestion',
        icon: BookOpen,
        message: `${lowGpaCount} ta o'quvchining akademik ko'rsatkichi past`,
        actionLabel: 'Batafsil',
        href: '/dashboard/insights',
        metric: lowGpaCount,
      });
    }

    // 9. Calm: upcoming exams
    if (upcomingExams > 0 && briefs.length < 3) {
      briefs.push({
        id: 'upcoming-exams',
        severity: 'calm',
        icon: ShieldCheck,
        message: `${upcomingExams} ta imtihon yaqinlashmoqda — tayyorgarlikni tekshiring`,
        actionLabel: 'Jadval',
        href: '/dashboard/exams',
        metric: upcomingExams,
      });
    }

    // 10. Calm: all clear (only if nothing else)
    if (briefs.length === 0) {
      briefs.push({
        id: 'all-clear',
        severity: 'calm',
        icon: CheckCircle2,
        message: "Barcha ko'rsatkichlar normal. Diqqat talab etadigan hodisa yo'q.",
        actionLabel: 'Monitoring',
        href: '/dashboard/reports',
      });
    }

    // Limit to top 5, sorted by severity
    const severityOrder = { critical: 0, attention: 1, suggestion: 2, calm: 3 };
    return briefs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 5);
  }, [data]);

  const hasCritical = items.some((i) => i.severity === 'critical');
  const hasAttention = items.some((i) => i.severity === 'attention');

  const accentColor =
    hasCritical ? 'bg-xedu-ruby-500' :
    hasAttention ? 'bg-xedu-amber-500' :
    'bg-xedu-primary';

  return (
    <div className="xedu-zumrad-core rounded-xl overflow-hidden">
      {/* Left severity accent */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', accentColor)} />

      {/* Header — executive intelligence surface */}
      <div className="flex items-center justify-between pl-5 pr-4 py-3 border-b border-xedu-border bg-gradient-to-b from-xedu-bg-subtle to-xedu-bg-rail dark:from-xedu-bg-subtle dark:to-xedu-bg-rail">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-xedu-primary-light/60 dark:bg-xedu-primary/15 flex items-center justify-center border border-xedu-primary/10 dark:border-xedu-primary/20">
            <Lightbulb className="h-3.5 w-3.5 text-xedu-primary" />
          </div>
          <h3 className="text-authority-sm text-xedu-slate-900 dark:text-xedu-slate-100">
            Bugungi tavsiya
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {hasCritical && (
            <span className="flex items-center gap-1.5 text-2xs font-bold px-2.5 py-1 rounded-full bg-xedu-ruby-50/80 dark:bg-xedu-ruby-900/20 text-xedu-ruby-600 dark:text-xedu-ruby-400 border border-xedu-ruby-200/50 dark:border-xedu-ruby-800/30">
              <span className="h-1.5 w-1.5 rounded-full bg-xedu-ruby-500 animate-pulse" />
              Jiddiy
            </span>
          )}
          {hasAttention && !hasCritical && (
            <span className="flex items-center gap-1.5 text-2xs font-bold px-2.5 py-1 rounded-full bg-xedu-amber-50/80 dark:bg-xedu-amber-900/20 text-xedu-amber-600 dark:text-xedu-amber-400 border border-xedu-amber-200/50 dark:border-xedu-amber-800/30">
              <span className="h-1.5 w-1.5 rounded-full bg-xedu-amber-500" />
              Diqqat
            </span>
          )}
          {!hasCritical && !hasAttention && (
            <span className="flex items-center gap-1.5 text-2xs font-bold px-2.5 py-1 rounded-full bg-xedu-primary-light/50 text-xedu-primary border border-xedu-primary/10">
              <span className="h-1.5 w-1.5 rounded-full bg-xedu-primary" />
              Normal
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-xedu-border">
        {items.map((item) => (
          <BriefingRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
});

const BriefingRow = memo(function BriefingRow({ item }: { item: BriefingItem }) {
  const { icon: Icon, severity, message, actionLabel, href, metric } = item;

  const severityStyles = {
    critical: {
      icon: 'text-xedu-ruby-500',
      bg: 'bg-xedu-ruby-50/50 dark:bg-xedu-ruby-900/10',
      metric: 'text-xedu-ruby-600 dark:text-xedu-ruby-400',
      actionBg: 'bg-xedu-ruby-50/80 text-xedu-ruby-700 dark:bg-xedu-ruby-900/25 dark:text-xedu-ruby-400 group-hover:bg-xedu-ruby-100 dark:group-hover:bg-xedu-ruby-900/40',
      border: 'border-xedu-ruby-200/30 dark:border-xedu-ruby-800/20',
    },
    attention: {
      icon: 'text-xedu-amber-500',
      bg: 'bg-xedu-amber-50/30 dark:bg-xedu-amber-900/08',
      metric: 'text-xedu-amber-600 dark:text-xedu-amber-400',
      actionBg: 'bg-xedu-amber-50/80 text-xedu-amber-700 dark:bg-xedu-amber-900/25 dark:text-xedu-amber-400 group-hover:bg-xedu-amber-100 dark:group-hover:bg-xedu-amber-900/40',
      border: 'border-xedu-amber-200/30 dark:border-xedu-amber-800/20',
    },
    suggestion: {
      icon: 'text-xedu-sky-500',
      bg: 'bg-xedu-sky-50/20 dark:bg-xedu-sky-900/08',
      metric: 'text-xedu-sky-600 dark:text-xedu-sky-400',
      actionBg: 'bg-xedu-sky-50/80 text-xedu-sky-700 dark:bg-xedu-sky-900/25 dark:text-xedu-sky-400 group-hover:bg-xedu-sky-100 dark:group-hover:bg-xedu-sky-900/40',
      border: 'border-xedu-sky-200/30 dark:border-xedu-sky-800/20',
    },
    calm: {
      icon: 'text-xedu-primary',
      bg: 'bg-xedu-primary-light/15 dark:bg-xedu-primary/08',
      metric: 'text-xedu-primary',
      actionBg: 'bg-xedu-primary-light/50 text-xedu-primary group-hover:bg-xedu-primary-light',
      border: 'border-xedu-primary/10 dark:border-xedu-primary/15',
    },
  }[severity];

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 pl-5 pr-4 py-3.5 transition-all duration-150',
        'hover:bg-xedu-slate-50/60 dark:hover:bg-xedu-slate-800/20',
        severityStyles.bg
      )}
    >
      <div className={cn(
        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border',
        severityStyles.bg,
        severityStyles.border
      )}>
        <Icon className={cn('h-4 w-4', severityStyles.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-xedu-slate-800 dark:text-xedu-slate-200 leading-snug">
          {message}
        </p>
      </div>
      {metric !== undefined && (
        <span className={cn('text-xs font-bold tabular-nums shrink-0 hidden sm:inline', severityStyles.metric)}>
          {metric}
        </span>
      )}
      <span className={cn(
        'flex items-center gap-0.5 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border',
        severityStyles.actionBg,
        severityStyles.border
      )}>
        {actionLabel}
        <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
});
