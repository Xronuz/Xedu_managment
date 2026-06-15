'use client';

import { useEffect, useRef } from 'react';
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
  const scrollerRef  = useRef<HTMLDivElement>(null);

  const activeTab = searchParams.get('tab') ?? defaultTab ?? tabs[0]?.id;

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.roles) return true;
    if (!user) return false;
    const effective = user.role === 'class_teacher' ? ['class_teacher', 'teacher'] : [user.role];
    return tab.roles.some((r) => effective.includes(r));
  });

  // Mobil: faol tab har doim ko'rinadigan bo'lishi uchun markazga skroll qilamiz
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="true"]');
    active?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [activeTab]);

  const go = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Bitta tab tanlov bermaydi — tab-bar faqat 2+ bo'lim borida ko'rsatiladi
  if (visibleTabs.length <= 1) return null;

  return (
    <div
      ref={scrollerRef}
      className={cn(
        'mb-6 w-full sm:w-auto flex sm:inline-flex items-center gap-1 overflow-x-auto no-scrollbar rounded-[18px] p-1.5 bg-xedu-slate-100 dark:bg-white/[0.06] shadow-[var(--xedu-shadow-inset)]',
        '[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]',
        'sm:[mask-image:none]',
      )}
    >
      {visibleTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => go(tab.id)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-[14px] px-3.5 py-1.5 sm:px-5 sm:py-2',
              'text-xs sm:text-[13px] font-semibold transition-all duration-200',
              active
                ? 'bg-xedu-bg-elevated dark:bg-xedu-slate-700 text-xedu-slate-800 dark:text-xedu-slate-100 shadow-premium-sm'
                : 'text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200 hover:bg-white/40 dark:hover:bg-white/10',
            )}
          >
            {tab.label}
          </button>
        );
      })}
      {/* Mobil uchun skroll bo'sh joyi — oxirgi tab fade ostida qolib ketmasin */}
      <span className="shrink-0 w-1 sm:hidden" aria-hidden />
    </div>
  );
}
