'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { opsCommandCenterApi } from '@/lib/api/ops-command-center';
import { useAuthStore } from '@/store/auth.store';

const STATUS_CONFIG = {
  not_started: { label: 'Boshlanmagan', tone: 'bg-xedu-slate-100 text-xedu-slate-600' as const, icon: XCircle },
  in_progress: { label: 'Jarayonda', tone: 'bg-amber-50 text-xedu-amber' as const, icon: AlertCircle },
  ready: { label: 'Tayyor', tone: 'bg-xedu-primary-light text-xedu-primary' as const, icon: CheckCircle2 },
  operational: { label: 'Ishlayapti', tone: 'bg-xedu-primary-light text-xedu-primary' as const, icon: CheckCircle2 },
};

export function ReadinessScoreCard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const schoolId = user?.schoolId;

  const { data, isLoading } = useQuery({
    queryKey: ['ops', 'readiness', schoolId],
    queryFn: () => opsCommandCenterApi.getReadiness(schoolId!),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });

  const recalc = useMutation({
    mutationFn: () => opsCommandCenterApi.recalculateReadiness(schoolId!),
    onSuccess: (result) => {
      queryClient.setQueryData(['ops', 'readiness', schoolId], result);
    },
  });

  if (isLoading) {
    return (
      <Card className="border-xedu-border">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const status = STATUS_CONFIG[data.status];
  const StatusIcon = status.icon;
  const completedCount = data.checklist.filter((i) => i.completed).length;
  const totalCount = data.checklist.length;

  return (
    <Card className="border-xedu-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', status.tone)}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Tayyorlik holati</CardTitle>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                {completedCount} / {totalCount} qadam bajarildi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full px-3 py-1 text-sm font-bold', status.tone)}>
              {data.score}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => recalc.mutate()}
              disabled={recalc.isPending}
            >
              <RefreshCw className={cn('h-4 w-4', recalc.isPending && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded((p) => !p)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Progress bar */}
      <CardContent className="pt-0">
        <div className="h-2 w-full overflow-hidden rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              data.score >= 70 ? 'bg-xedu-primary' : data.score >= 40 ? 'bg-xedu-amber' : 'bg-xedu-ruby',
            )}
            style={{ width: `${data.score}%` }}
          />
        </div>

        {/* Checklist */}
        {expanded && (
          <div className="mt-4 space-y-2">
            {data.checklist.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                  item.completed
                    ? 'border-xedu-primary/10 bg-xedu-primary-light/30 dark:bg-xedu-primary/10'
                    : item.required
                      ? 'border-xedu-ruby/10 bg-red-50/50 dark:bg-red-900/5'
                      : 'border-xedu-border bg-xedu-bg-panel',
                )}
              >
                <div className="flex items-center gap-2">
                  {item.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-xedu-primary" />
                  ) : item.required ? (
                    <AlertCircle className="h-4 w-4 text-xedu-ruby" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-xedu-slate-300" />
                  )}
                  <span
                    className={cn(
                      item.completed && 'text-xedu-slate-500 line-through',
                      !item.completed && item.required && 'font-medium text-xedu-slate-800 dark:text-xedu-slate-200',
                    )}
                  >
                    {item.label}
                  </span>
                  {item.required && !item.completed && (
                    <span className="rounded bg-xedu-ruby/10 px-1.5 py-0.5 text-[10px] font-semibold text-xedu-ruby">
                      Majburiy
                    </span>
                  )}
                </div>
                <span className="text-xs text-xedu-slate-400">+{item.weight}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
