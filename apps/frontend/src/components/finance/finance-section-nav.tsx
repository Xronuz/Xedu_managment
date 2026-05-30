'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const FINANCE_TABS = [
  { label: 'Moliya',    href: '/dashboard/finance' },
  { label: "To'lovlar", href: '/dashboard/payments' },
  { label: 'Ish haqi',  href: '/dashboard/payroll' },
  { label: 'Tariflar',  href: '/dashboard/fee-structures' },
];

export function FinanceSectionNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const visibleTabs = user?.role === 'director'
    ? FINANCE_TABS.filter((t) => t.href !== '/dashboard/fee-structures')
    : FINANCE_TABS;

  return (
    <div className="mb-5 inline-flex items-center gap-1 overflow-x-auto no-scrollbar rounded-[18px] p-1.5 bg-xedu-slate-100 dark:bg-white/[0.06] shadow-[var(--xedu-shadow-inset)]">
      {visibleTabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'whitespace-nowrap rounded-[14px] px-5 py-2',
              'text-[13px] font-semibold transition-all duration-200',
              active
                ? 'bg-xedu-bg-elevated dark:bg-xedu-slate-700 text-xedu-slate-800 dark:text-xedu-slate-100 shadow-premium-sm'
                : 'text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200 hover:bg-white/40 dark:hover:bg-white/10',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
