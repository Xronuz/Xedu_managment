'use client';

import { cn } from '@/lib/utils';
import { BookOpen, FileText, Calendar, ClipboardList, AlertCircle, type LucideIcon } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   ACADEMIC EMPTY STATE
   Contextual empty states for academic modules.

   No "fun" illustrations, no gamification hooks.
   Clear, calm, actionable guidance.
   ═══════════════════════════════════════════════════════════════════════════════ */

type EmptyContext = 'homework' | 'grades' | 'schedule' | 'attendance' | 'payments' | 'exams' | 'general';

interface AcademicEmptyStateProps {
  context?: EmptyContext;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const contextConfig: Record<EmptyContext, { icon: LucideIcon; defaultTitle: string; defaultDescription: string }> = {
  homework: {
    icon: BookOpen,
    defaultTitle: "Uyga vazifa yo'q",
    defaultDescription: 'Hozircha hech qanday topshirish kerak bo\'lgan vazifa yo\'q',
  },
  grades: {
    icon: FileText,
    defaultTitle: "Baholar yo'q",
    defaultDescription: 'Bu davr uchun baholar hali qo\'yilmagan',
  },
  schedule: {
    icon: Calendar,
    defaultTitle: "Dars jadvali yo'q",
    defaultDescription: 'Siz uchun dars jadvali tuzilmagan',
  },
  attendance: {
    icon: ClipboardList,
    defaultTitle: "Davomat ma'lumoti yo'q",
    defaultDescription: 'Bu davr uchun davomat yozuvlari topilmadi',
  },
  payments: {
    icon: FileText,
    defaultTitle: "To'lov ma'lumoti yo'q",
    defaultDescription: 'To\'lov ma\'lumotlari hozircha mavjud emas',
  },
  exams: {
    icon: FileText,
    defaultTitle: "Imtihon yo'q",
    defaultDescription: 'Yaqinda hech qanday imtihon rejalashtirilmagan',
  },
  general: {
    icon: AlertCircle,
    defaultTitle: "Ma'lumot yo'q",
    defaultDescription: 'Ko\'rsatilayotgan ma\'lumotlar hozircha mavjud emas',
  },
};

export function AcademicEmptyState({
  context = 'general',
  title,
  description,
  action,
  className,
  compact = false,
}: AcademicEmptyStateProps) {
  const config = contextConfig[context];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 py-4 px-3 rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800/50', className)}>
        <Icon className="h-4 w-4 text-xedu-slate-400 shrink-0" />
        <div>
          <p className="text-xs font-medium text-xedu-slate-600 dark:text-xedu-slate-400">{title ?? config.defaultTitle}</p>
          <p className="text-xs text-xedu-slate-400 dark:text-xedu-slate-500">{description ?? config.defaultDescription}</p>
        </div>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800 text-xedu-slate-400 mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-xedu-slate-700 dark:text-xedu-slate-300 mb-1">
        {title ?? config.defaultTitle}
      </h3>
      <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 max-w-xs">
        {description ?? config.defaultDescription}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
