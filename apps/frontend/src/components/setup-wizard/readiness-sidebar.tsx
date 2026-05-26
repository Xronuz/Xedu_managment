'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { opsCommandCenterApi } from '@/lib/api/ops-command-center';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface ReadinessSidebarProps {
  className?: string;
}

export function ReadinessSidebar({ className }: ReadinessSidebarProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const schoolId = user?.schoolId;

  const {
    data: readiness,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['readiness', schoolId],
    queryFn: () => (schoolId ? opsCommandCenterApi.getReadiness(schoolId) : Promise.reject('no school')),
    enabled: !!schoolId,
    staleTime: 60_000,
  });

  const handleRecalculate = async () => {
    if (!schoolId) return;
    try {
      await opsCommandCenterApi.recalculateReadiness(schoolId);
      await refetch();
      toast({ title: 'Tayyorgarlik bahosi yangilandi' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: e?.message ?? 'Xato' });
    }
  };

  const score = readiness?.score ?? 0;
  const checklist = readiness?.checklist ?? [];

  const scoreColor =
    score >= 80 ? 'text-xedu-emerald' : score >= 50 ? 'text-xedu-amber' : 'text-xedu-ruby';
  const scoreBg =
    score >= 80 ? 'bg-xedu-emerald/10' : score >= 50 ? 'bg-xedu-amber/10' : 'bg-xedu-ruby/10';

  return (
    <div className={cn('rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-950 p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tayyorgarlik bahosi</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRecalculate} disabled={isRefetching}>
          <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-xedu-slate-400" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className={cn('h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold', scoreBg, scoreColor)}>
              {score}
            </div>
            <div>
              <p className={cn('text-sm font-medium', scoreColor)}>
                {score >= 80 ? 'Tayyor' : score >= 50 ? 'Jarayonda' : 'Boshlang\'ich'}
              </p>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                {checklist.filter((c) => c.completed).length} / {checklist.length} qadam
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                {item.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-xedu-emerald shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-xedu-slate-400 shrink-0" />
                )}
                <span className={cn(item.completed ? 'text-xedu-slate-600 dark:text-xedu-slate-300' : 'text-xedu-slate-400 dark:text-xedu-slate-500')}>
                  {item.label}
                </span>
                <span className="ml-auto text-xedu-slate-400">{item.weight} bal</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
