'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Users, AlertTriangle, FileCheck,
  Clock, Briefcase, Repeat, Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiStrip, KpiCard } from '@/components/dashboard/kpi-card';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { opsCommandCenterApi } from '@/lib/api/ops-command-center';

export function TodaySummaryCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['ops', 'today-summary'],
    queryFn: () => opsCommandCenterApi.getTodaySummary(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className="border-xedu-border">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <KpiStrip>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </KpiStrip>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const payrollStatusMap: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
    draft: { label: 'Qoralama', tone: 'warning' },
    generated: { label: 'Hisoblangan', tone: 'info' },
    approved: { label: 'Tasdiqlangan', tone: 'success' },
    paid: { label: 'To\'langan', tone: 'success' },
    missing: { label: 'Yo\'q', tone: 'danger' },
  };
  const payrollStatus = payrollStatusMap[data.payroll.currentMonthStatus] ?? { label: 'Noma\'lum', tone: 'neutral' };

  return (
    <Card className="border-xedu-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Bugunlik umumiy ko\'rinish</CardTitle>
          <span className="text-xs text-xedu-slate-400">{data.date}</span>
        </div>
      </CardHeader>
      <CardContent>
        <KpiStrip>
          <KpiCard
            label="Darslar"
            value={data.schedule.publishedSlots}
            description={`${data.schedule.draftSlots} ta qoralama`}
            icon={Calendar}
            iconColor="primary"
            density="compact"
          />
          <KpiCard
            label="O\'qituvchilar"
            value={`${data.staff.teachersPresent}/${data.stats.totalTeachersToday}`}
            description={`${data.staff.teachersAbsent} ta yo\'q, ${data.staff.teachersSubstituted} ta almashtirilgan`}
            icon={Users}
            iconColor="sky"
            density="compact"
          />
          <KpiCard
            label="Almashtirishlar"
            value={data.substitutions.activeToday}
            description={`${data.substitutions.pendingProposals} ta tasdiqlanmagan`}
            icon={Repeat}
            iconColor="amber"
            density="compact"
          />
          <KpiCard
            label="Ish haqi"
            value={<StatusBadge label={payrollStatus.label} tone={payrollStatus.tone} dot />}
            description={`${data.payroll.missingAttendanceCount} ta davomat yetishmayapti`}
            icon={Wallet}
            iconColor="gold"
            density="compact"
          />
        </KpiStrip>

        {/* Alert summary chips */}
        {data.alerts.critical + data.alerts.warning + data.alerts.info > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.alerts.critical > 0 && (
              <StatusBadge label={`${data.alerts.critical} ta jiddiy`} tone="danger" dot />
            )}
            {data.alerts.warning > 0 && (
              <StatusBadge label={`${data.alerts.warning} ta ogohlantirish`} tone="warning" dot />
            )}
            {data.alerts.info > 0 && (
              <StatusBadge label={`${data.alerts.info} ta ma\'lumot`} tone="info" dot />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
