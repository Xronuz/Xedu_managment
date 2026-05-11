'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export interface SectionTab {
  id: string;
  label: string;
  roles?: string[];
}

interface SectionTabsProps {
  tabs: SectionTab[];
  defaultTab?: string;
}

export function SectionTabs({ tabs, defaultTab }: SectionTabsProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { user }     = useAuthStore();

  const activeTab = searchParams.get('tab') ?? defaultTab ?? tabs[0]?.id;

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.roles) return true;
    if (!user) return false;
    const effective = user.role === 'class_teacher' ? ['class_teacher', 'teacher'] : [user.role];
    return tab.roles.some((r) => effective.includes(r));
  });

  const go = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-6 inline-flex items-center gap-1 overflow-x-auto no-scrollbar rounded-[18px] p-1.5 bg-xedu-slate-100 dark:bg-white/[0.06] shadow-[var(--xedu-shadow-inset)]">
      {visibleTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => go(tab.id)}
            className={cn(
              'whitespace-nowrap rounded-[14px] px-5 py-2',
              'text-[13px] font-semibold transition-all duration-200',
              active
                ? 'bg-xedu-bg-elevated dark:bg-xedu-slate-700 text-xedu-slate-800 dark:text-xedu-slate-100 shadow-premium-sm'
                : 'text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200 hover:bg-white/40 dark:hover:bg-white/10',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
