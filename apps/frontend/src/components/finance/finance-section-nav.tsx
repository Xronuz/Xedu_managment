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

  // 1-daraja (sahifalararo) navigatsiya — ichki segmented pill tablardan
  // farqlash uchun tinch "underline" uslubda (AnalyticsSectionNav bilan bir xil)
  return (
    <nav
      aria-label="Moliya bo'limlari"
      className="mb-5 flex items-center gap-1 border-b border-xedu-border overflow-x-auto no-scrollbar"
    >
      {visibleTabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'relative whitespace-nowrap px-3.5 py-2.5',
              'text-[13px] font-semibold transition-colors duration-150',
              active
                ? 'text-xedu-primary'
                : 'text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-800 dark:hover:text-xedu-slate-200',
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-xedu-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
