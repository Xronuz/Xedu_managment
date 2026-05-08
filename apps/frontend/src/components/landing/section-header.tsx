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
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', 'max-w-2xl', align === 'center' ? 'mx-auto' : '', className)}>
      {label && (
        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-xedu-primary mb-5">
          {label}
        </span>
      )}
      <h2 className="text-[1.75rem] sm:text-[2.25rem] font-bold tracking-[-0.03em] text-xedu-slate-950 leading-[1.15]">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-base sm:text-[1.0625rem] text-xedu-slate-500 leading-[1.7]">
          {description}
        </p>
      )}
    </div>
  );
}
