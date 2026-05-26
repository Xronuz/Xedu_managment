'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/dashboard/empty-state';
import { cn } from '@/lib/utils';
import { opsCommandCenterApi, type OpsAlert } from '@/lib/api/ops-command-center';
import { useRouter } from 'next/navigation';

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    border: 'border-l-xedu-ruby',
    bg: 'bg-red-50/50 dark:bg-red-900/5',
    iconColor: 'text-xedu-ruby',
  },
  warning: {
    icon: AlertCircle,
    border: 'border-l-xedu-amber',
    bg: 'bg-amber-50/50 dark:bg-amber-900/5',
    iconColor: 'text-xedu-amber',
  },
  info: {
    icon: Info,
    border: 'border-l-xedu-sky',
    bg: 'bg-sky-50/50 dark:bg-sky-900/5',
    iconColor: 'text-xedu-sky',
  },
};

function AlertItem({ alert, onAcknowledge }: { alert: OpsAlert; onAcknowledge: (id: string) => void }) {
  const router = useRouter();
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;

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
        <p className="text-sm font-medium text-xedu-slate-800 dark:text-xedu-slate-200">{alert.title}</p>
        <p className="mt-0.5 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{alert.description}</p>
        {alert.link && (
          <button
            onClick={() => router.push(alert.link!)}
            className="mt-1.5 text-xs font-medium text-xedu-primary hover:underline"
          >
            Ko\'rish →
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
  const { data, isLoading } = useQuery({
    queryKey: ['ops', 'alerts'],
    queryFn: () => opsCommandCenterApi.getAlerts(),
    staleTime: 30_000,
  });

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

  return (
    <Card className="border-xedu-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-xedu-slate-500" />
            <CardTitle className="text-base font-semibold">Ogohlantirishlar</CardTitle>
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
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Hozircha operatsion ogohlantirish yo\'q"
            description="Barcha tizimlar normal ishlamoqda"
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
