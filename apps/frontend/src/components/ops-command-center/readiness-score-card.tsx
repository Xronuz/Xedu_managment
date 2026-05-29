'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, UserCheck, Users, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { opsCommandCenterApi } from '@/lib/api/ops-command-center';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@eduplatform/types';

const STATUS_CONFIG = {
  not_started: { label: 'Boshlanmagan', tone: 'bg-xedu-slate-100 text-xedu-slate-600' as const, icon: XCircle },
  in_progress: { label: 'Jarayonda', tone: 'bg-amber-50 text-xedu-amber' as const, icon: AlertCircle },
  ready: { label: 'Tayyor', tone: 'bg-xedu-primary-light text-xedu-primary' as const, icon: CheckCircle2 },
  operational: { label: 'Ishlayapti', tone: 'bg-xedu-primary-light text-xedu-primary' as const, icon: CheckCircle2 },
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

export function ReadinessScoreCard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const schoolId = user?.schoolId;
  const userRole = user?.role;
  const isDirector = userRole === UserRole.DIRECTOR;

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

  // Categorize items by ownership
  const myActions = data.checklist.filter(
    (i) => i.primaryOwner === userRole && !i.completed
  );
  const delegatedActions = data.checklist.filter(
    (i) => i.secondaryOwner === userRole && !i.completed && i.primaryOwner !== userRole
  );
  const informational = data.checklist.filter(
    (i) =>
      i.visibilityScope?.includes(userRole ?? '') &&
      !i.completed &&
      i.primaryOwner !== userRole &&
      i.secondaryOwner !== userRole
  );

  // Director-specific: group delegated blockers by owner
  const blockerByOwner = isDirector
    ? informational.reduce<Record<string, number>>((acc, item) => {
        acc[item.primaryOwner] = (acc[item.primaryOwner] ?? 0) + 1;
        return acc;
      }, {})
    : {};

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

        {/* Ownership summary badges */}
        {!expanded && (
          <div className="mt-3 flex flex-wrap gap-2">
            {myActions.length > 0 && (
              <Badge className="bg-xedu-ruby/10 text-xedu-ruby">
                <UserCheck className="mr-1 h-3 w-3" />
                {myActions.length} ta sizning vazifangiz
              </Badge>
            )}
            {delegatedActions.length > 0 && (
              <Badge className="bg-xedu-amber/10 text-xedu-amber">
                <Users className="mr-1 h-3 w-3" />
                {delegatedActions.length} ta topshirilgan
              </Badge>
            )}
            {informational.length > 0 && (
              <Badge className="bg-xedu-sky/10 text-xedu-sky">
                <Eye className="mr-1 h-3 w-3" />
                {informational.length} ta ma'lumot
              </Badge>
            )}
            {/* Director delegation summary */}
            {isDirector && Object.keys(blockerByOwner).length > 0 && (
              <div className="w-full flex flex-wrap gap-1.5 mt-1">
                {Object.entries(blockerByOwner).map(([owner, count]) => (
                  <span
                    key={owner}
                    className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', OWNER_BADGE_CLASS[owner] ?? 'bg-xedu-slate-100 text-xedu-slate-600')}
                  >
                    {OWNER_LABELS[owner] ?? owner}: {count} ta
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Checklist */}
        {expanded && (
          <div className="mt-4 space-y-3">
            {myActions.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-xedu-ruby">Sizning vazifalaringiz</p>
                <div className="space-y-1.5">
                  {myActions.map((item) => (
                    <ReadinessItemRow key={item.id} item={item} userRole={userRole} />
                  ))}
                </div>
              </div>
            )}
            {delegatedActions.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-xedu-amber">Topshirilgan vazifalar</p>
                <div className="space-y-1.5">
                  {delegatedActions.map((item) => (
                    <ReadinessItemRow key={item.id} item={item} userRole={userRole} />
                  ))}
                </div>
              </div>
            )}
            {informational.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-xedu-sky">Ma'lumot uchun</p>
                <div className="space-y-1.5">
                  {informational.map((item) => (
                    <ReadinessItemRow key={item.id} item={item} userRole={userRole} />
                  ))}
                </div>
              </div>
            )}
            {data.checklist.filter((i) => i.completed).length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-xedu-primary">Bajarilgan</p>
                <div className="space-y-1.5">
                  {data.checklist.filter((i) => i.completed).map((item) => (
                    <ReadinessItemRow key={item.id} item={item} userRole={userRole} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReadinessItemRow({ item, userRole }: { item: any; userRole?: string }) {
  const isMine = item.primaryOwner === userRole;
  const isDelegated = item.secondaryOwner === userRole && item.primaryOwner !== userRole;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
        item.completed
          ? 'border-xedu-primary/10 bg-xedu-primary-light/30 dark:bg-xedu-primary/10'
          : item.required
            ? isMine
              ? 'border-xedu-ruby/20 bg-red-50/70 dark:bg-red-900/10'
              : 'border-xedu-amber/10 bg-amber-50/50 dark:bg-amber-900/5'
            : 'border-xedu-border bg-xedu-bg-panel',
      )}
    >
      <div className="flex items-center gap-2">
        {item.completed ? (
          <CheckCircle2 className="h-4 w-4 text-xedu-primary" />
        ) : item.required ? (
          <AlertCircle className={cn('h-4 w-4', isMine ? 'text-xedu-ruby' : 'text-xedu-amber')} />
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
      <div className="flex items-center gap-2">
        {!item.completed && (
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', OWNER_BADGE_CLASS[item.primaryOwner] ?? 'bg-xedu-slate-100 text-xedu-slate-600')}>
            {OWNER_LABELS[item.primaryOwner] ?? item.primaryOwner}
          </span>
        )}
        <span className="text-xs text-xedu-slate-400">+{item.weight}%</span>
      </div>
    </div>
  );
}
