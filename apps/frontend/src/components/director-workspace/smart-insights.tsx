'use client';

import { useMemo } from 'react';
import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle, Users, Wallet, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════════
   SMART CONTEXTUAL INSIGHTS
   Derived operational insight sentences. No fake AI. Real data only.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface InsightData {
  branches?: any[];
  attendanceSummary?: { presentPct?: number; totalStudents?: number } | null;
  pendingLeaves?: any[];
  pendingDiscipline?: any[];
  aiSummary?: { riskDistribution?: { critical?: number; high?: number }; averages?: { gpa?: number } } | null;
  financeData?: { thisMonthRevenue?: number; lastMonthRevenue?: number; overdueAmount?: number } | null;
  teacherCount?: number;
  studentCount?: number;
}

interface SmartInsightsProps {
  data: InsightData;
  maxInsights?: number;
}

interface Insight {
  id: string;
  icon: React.ElementType;
  tone: 'calm' | 'attention' | 'urgent';
  text: string;
}

export function SmartInsights({ data, maxInsights = 4 }: SmartInsightsProps) {
  const insights = useMemo(() => {
    const items: Insight[] = [];
    const {
      branches = [],
      attendanceSummary,
      pendingLeaves = [],
      pendingDiscipline = [],
      aiSummary,
      financeData,
      teacherCount = 0,
      studentCount = 0,
    } = data;

    // 1. Attendance decline insight
    const pct = attendanceSummary?.presentPct ?? 0;
    if (pct > 0 && pct < 75) {
      items.push({
        id: 'att-decline',
        icon: TrendingDown,
        tone: 'urgent',
        text: `Maktab bo'ylab davomat ${pct}% — normaldan ${75 - pct} foizga past. E'tibor talab etiladi.`,
      });
    } else if (pct > 0 && pct < 85) {
      items.push({
        id: 'att-low',
        icon: TrendingDown,
        tone: 'attention',
        text: `Davomat ${pct}% — yaxshilanishi mumkin.`,
      });
    }

    // 2. Branch-specific insights
    const inactiveBranches = branches.filter((b: any) => !b.isActive);
    if (inactiveBranches.length > 0) {
      items.push({
        id: 'inactive-branches',
        icon: AlertTriangle,
        tone: 'attention',
        text: `${inactiveBranches.length} ta filial nofaol holatda: ${inactiveBranches.map((b: any) => b.name).join(', ')}.`,
      });
    }

    // 3. Staffing pressure
    if (teacherCount > 0 && studentCount > 0) {
      const ratio = studentCount / teacherCount;
      if (ratio > 25) {
        items.push({
          id: 'staff-pressure',
          icon: Users,
          tone: 'attention',
          text: `O'qituvchi yuklamasi yuqori: har bir o'qituvchiga ${Math.round(ratio)} ta o'quvchi (${studentCount} / ${teacherCount}).`,
        });
      }
    }

    // 4. Pending accumulation
    const totalPending = pendingLeaves.length + pendingDiscipline.length;
    if (totalPending > 5) {
      items.push({
        id: 'pending-backlog',
        icon: AlertTriangle,
        tone: 'urgent',
        text: `${totalPending} ta tasdiqlanmagan ish yig'ildi. Tezkor ko'rib chiqish zarur.`,
      });
    } else if (totalPending > 0) {
      items.push({
        id: 'pending-small',
        icon: AlertTriangle,
        tone: 'attention',
        text: `${totalPending} ta ish tasdiqlashni kutyapti.`,
      });
    }

    // 5. Finance insight
    const overdue = financeData?.overdueAmount ?? 0;
    const thisMonth = financeData?.thisMonthRevenue ?? 0;
    const lastMonth = financeData?.lastMonthRevenue ?? 0;
    if (overdue > 0) {
      items.push({
        id: 'finance-overdue',
        icon: Wallet,
        tone: 'urgent',
        text: `Kechikkan to'lovlar: ${overdue.toLocaleString()} UZS. Yig'im jarayoni sekinlashgan.`,
      });
    }
    if (lastMonth > 0 && thisMonth < lastMonth * 0.8) {
      items.push({
        id: 'finance-drop',
        icon: TrendingDown,
        tone: 'attention',
        text: `Oyma-oy tushum ${Math.round((1 - thisMonth / lastMonth) * 100)}% kamaydi.`,
      });
    } else if (lastMonth > 0 && thisMonth > lastMonth * 1.2) {
      items.push({
        id: 'finance-rise',
        icon: TrendingUp,
        tone: 'calm',
        text: `Oyma-oy tushum ${Math.round((thisMonth / lastMonth - 1) * 100)}% oshdi.`,
      });
    }

    // 6. AI risk insight
    const critical = aiSummary?.riskDistribution?.critical ?? 0;
    const high = aiSummary?.riskDistribution?.high ?? 0;
    if (critical > 0) {
      items.push({
        id: 'ai-critical',
        icon: AlertTriangle,
        tone: 'urgent',
        text: `${critical} ta o'quvchi kritik xavf ostida. Tezkor aralashish talab etiladi.`,
      });
    } else if (high > 0) {
      items.push({
        id: 'ai-high',
        icon: AlertTriangle,
        tone: 'attention',
        text: `${high} ta o'quvchi yuqori xavf darajasida. Monitoring davom ettirilmoqda.`,
      });
    }

    // 7. GPA insight
    const gpa = aiSummary?.averages?.gpa;
    if (gpa != null && gpa < 60) {
      items.push({
        id: 'gpa-low',
        icon: BookOpen,
        tone: 'attention',
        text: `O'rtacha akademik ko'rsatkich (${gpa.toFixed(1)}) normaldan past. Qo'llab-quvvatlash rejalashtiring.`,
      });
    }

    return items.slice(0, maxInsights);
  }, [data, maxInsights]);

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg-elevated overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
        <Lightbulb className="h-3 w-3 text-xedu-slate-400" />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-xedu-slate-500">Tahliliy xulosalar</p>
      </div>
      <div className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
        {insights.map((insight) => (
          <InsightRow key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const { icon: Icon, tone, text } = insight;

  const toneColor = {
    calm: 'text-xedu-slate-400',
    attention: 'text-xedu-amber-500',
    urgent: 'text-xedu-ruby-500',
  }[tone];

  const bgColor = {
    calm: 'transparent',
    attention: 'bg-xedu-amber-50/30 dark:bg-xedu-amber-900/10',
    urgent: 'bg-xedu-ruby-50/30 dark:bg-xedu-ruby-900/10',
  }[tone];

  return (
    <div className={cn('flex items-start gap-2 px-3 py-2', bgColor)}>
      <Icon className={cn('h-3 w-3 shrink-0 mt-0.5', toneColor)} />
      <p className="text-[12px] font-medium text-xedu-slate-700 dark:text-xedu-slate-300 leading-snug">
        {text}
      </p>
    </div>
  );
}
