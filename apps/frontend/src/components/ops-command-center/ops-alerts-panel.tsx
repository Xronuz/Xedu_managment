'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X, Bell, User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/dashboard/empty-state';
import { cn } from '@/lib/utils';
import { opsCommandCenterApi, type OpsAlert } from '@/lib/api/ops-command-center';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@eduplatform/types';

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    border: 'border-l-xedu-ruby',
    bg: 'bg-red-50/50 dark:bg-red-900/5',
    iconColor: 'text-xedu-ruby',
    badge: 'bg-xedu-ruby/10 text-xedu-ruby',
  },
  warning: {
    icon: AlertCircle,
    border: 'border-l-xedu-amber',
    bg: 'bg-amber-50/50 dark:bg-amber-900/5',
    iconColor: 'text-xedu-amber',
    badge: 'bg-xedu-amber/10 text-xedu-amber',
  },
  info: {
    icon: Info,
    border: 'border-l-xedu-sky',
    bg: 'bg-sky-50/50 dark:bg-sky-900/5',
    iconColor: 'text-xedu-sky',
    badge: 'bg-xedu-sky/10 text-xedu-sky',
  },
};

const OWNER_LABELS: Record<string, string> = {
  director: 'Direktor',
  vice_principal: "Mudir o'rinbosari",
  branch_admin: 'Filial admin',
  accountant: 'Moliyachi',
};

const OWNER_BADGE_CLASS: Record<string, string> = {
  director: 'bg-xedu-primary-light/60 text-xedu-primary dark:bg-xedu-primary/20 dark:text-xedu-emerald-400',
  vice_principal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  branch_admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  accountant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

/**
 * Director alert prioritization:
 * 1. Critical alerts where owner === director (Director must act)
 * 2. Critical alerts where owner !== director (blocked delegated tasks)
 * 3. Warning alerts where owner === director
 * 4. Warning alerts where owner !== director
 * 5. Suppress pure info alerts for Director (too noisy)
 */
function useDirectorAlerts(allAlerts: OpsAlert[] | undefined, isDirector: boolean): OpsAlert[] {
  return useMemo(() => {
    if (!allAlerts || allAlerts.length === 0) return [];
    if (!isDirector) return allAlerts;

    // Director sees: critical + warning only. Info alerts suppressed.
    const relevant = allAlerts.filter((a) => a.severity !== 'info');

    // Sort: Director-owned critical first, then other critical, then Director-owned warning, then other warning
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const ownershipOrder = (a: OpsAlert) => (a.owner === 'director' ? 0 : 1);

    return relevant.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return ownershipOrder(a) - ownershipOrder(b);
    });
  }, [allAlerts, isDirector]);
}

function AlertItem({ alert, onAcknowledge }: { alert: OpsAlert; onAcknowledge: (id: string) => void }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;
  const isMyAlert = alert.owner === user?.role;
  const isDirector = user?.role === UserRole.DIRECTOR;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border border-xedu-border border-l-4 p-3 transition-colors',
        config.border,
        config.bg,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.iconColor)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-xedu-slate-800 dark:text-xedu-slate-200">{alert.title}</p>
          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', config.badge)}>
            {alert.severity === 'critical' ? 'Jiddiy' : alert.severity === 'warning' ? 'Ogohlantirish' : 'Ma\'lumot'}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{alert.description}</p>

        {/* Ownership + Actionability */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', OWNER_BADGE_CLASS[alert.owner] ?? 'bg-xedu-slate-100 text-xedu-slate-600')}>
            {OWNER_LABELS[alert.owner] ?? alert.owner}
          </span>
          {isMyAlert && (
            <Badge variant="outline" className="text-[10px] border-xedu-primary text-xedu-primary">
              Sizning vazifangiz
            </Badge>
          )}
          {isDirector && !isMyAlert && (
            <Badge variant="outline" className="text-[10px] border-xedu-amber text-xedu-amber">
              Bloklangan
            </Badge>
          )}
        </div>

        {/* Action CTA */}
        {alert.route && (
          <button
            onClick={() => router.push(alert.route!)}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-xedu-primary hover:underline"
          >
            {alert.actionCta}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onAcknowledge(alert.id)}
      >
        <X className="h-3.5 w-3.5 text-xedu-slate-400" />
      </Button>
    </div>
  );
}

export function OpsAlertsPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isDirector = user?.role === UserRole.DIRECTOR;

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['ops', 'alerts'],
    queryFn: () => opsCommandCenterApi.getAlerts(),
    staleTime: 30_000,
  });

  const data = useDirectorAlerts(rawData, isDirector);

  const acknowledge = useMutation({
    mutationFn: (id: string) => opsCommandCenterApi.acknowledgeAlert(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['ops', 'alerts'] });
      const previous = queryClient.getQueryData<OpsAlert[]>(['ops', 'alerts']);
      queryClient.setQueryData<OpsAlert[]>(['ops', 'alerts'], (old) =>
        old ? old.filter((a) => a.id !== id) : []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['ops', 'alerts'], context.previous);
      }
    },
  });

  const title = isDirector ? 'Muhim ogohlantirishlar' : 'Ogohlantirishlar';
  const emptyTitle = isDirector ? "Muhim ogohlantirishlar yo'q" : "Hozircha operatsion ogohlantirish yo'q";
  const emptyDesc = isDirector
    ? 'Barcha kritik va ogohlantiruvchi signalar normal'
    : 'Barcha tizimlar normal ishlamoqda';

  return (
    <Card className="border-xedu-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-xedu-slate-500" />
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          {data && data.length > 0 && (
            <span className="rounded-full bg-xedu-ruby/10 px-2 py-0.5 text-xs font-semibold text-xedu-ruby">
              {data.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDesc}
            icon={CheckCircle2}
          />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {data.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onAcknowledge={(id) => acknowledge.mutate(id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
