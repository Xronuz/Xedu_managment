'use client';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({ label, title, description, align = 'center', className }: SectionHeaderProps) {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', 'max-w-3xl', align === 'center' ? 'mx-auto' : '', className)}>
      {label && (
        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-xedu-primary mb-4">
          {label}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-50 leading-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base sm:text-lg text-xedu-slate-500 dark:text-xedu-slate-400 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
