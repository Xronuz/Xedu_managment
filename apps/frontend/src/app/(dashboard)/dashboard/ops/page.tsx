'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/loading-skeletons';
import { useAuthStore } from '@/store/auth.store';
import {
  ReadinessScoreCard,
  TodaySummaryCard,
  OpsAlertsPanel,
  QuickActionsBar,
} from '@/components/ops-command-center';
import { ROUTE_PERMISSIONS } from '@/config/permissions';
import type { UserRole } from '@eduplatform/types';

export default function OpsCommandCenterPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    const allowed = ROUTE_PERMISSIONS['/dashboard/ops'];
    if (!allowed?.includes(user.role as UserRole)) {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, user, router]);

  if (!_hasHydrated || !user) {
    return <PageSkeleton statsCount={4} />;
  }

  const allowed = ROUTE_PERMISSIONS['/dashboard/ops'];
  if (!allowed?.includes(user.role as UserRole)) {
    return null;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-xedu-primary-light">
            <Activity className="h-5 w-5 text-xedu-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">
              Operatsion markaz
            </h1>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
              Jadval, xodim va moliyaviy operatsiyalarni boshqarish
            </p>
          </div>
        </div>
      </div>

      {/* Readiness + Today Summary */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ReadinessScoreCard />
        <TodaySummaryCard />
      </div>

      {/* Quick Actions + Alerts */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <QuickActionsBar />
        </div>
        <div className="lg:col-span-1">
          <OpsAlertsPanel />
        </div>
      </div>
    </div>
  );
}
