'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { canAccessRoute } from '@/config/permissions';

const ANALYTICS_TABS = [
  { label: 'Hisobotlar',       href: '/dashboard/reports' },
  { label: 'KPI Dashboard',    href: '/dashboard/kpi' },
  { label: 'Insights',         href: '/dashboard/insights' },
  { label: 'Marketing',        href: '/dashboard/marketing' },
  { label: 'Jadval analitikasi', href: '/dashboard/analytics/timetable' },
];

export function AnalyticsSectionNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  // Rolga ruxsat etilmagan tablar ko'rsatilmaydi (masalan, teacher uchun KPI/Marketing)
  const visibleTabs = ANALYTICS_TABS.filter((tab) => !user || canAccessRoute(user.role, tab.href));

  // 1-daraja (sahifalararo) navigatsiya — pastdagi segmented pill tablardan
  // farqlash uchun tinch "underline" uslubda
  return (
    <nav
      aria-label="Analitika bo'limlari"
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
