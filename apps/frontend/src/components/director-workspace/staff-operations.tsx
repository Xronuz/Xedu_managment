'use client';

import React, { memo } from 'react';
import { Users, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkspaceBlock } from './branch-health-map';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StaffOperationsProps {
  teacherCount?: number;
  staffCount?: number;
  pendingLeaves?: number;
  pendingDiscipline?: number;
  isLoading: boolean;
}

export const StaffOperations = memo(function StaffOperations({
  teacherCount = 0,
  staffCount = 0,
  pendingLeaves = 0,
  pendingDiscipline = 0,
  isLoading,
}: StaffOperationsProps) {
  if (isLoading) {
    return (
      <WorkspaceBlock title="Xodimlar" icon={Users} action={{ label: 'Batafsil', href: '/dashboard/staff' }}>
        <div className="p-4 space-y-3">
          <div className="flex gap-4">
            <Skeleton className="h-14 flex-1 rounded-md" />
            <Skeleton className="h-14 flex-1 rounded-md" />
          </div>
          <Skeleton className="h-8 rounded-md" />
        </div>
      </WorkspaceBlock>
    );
  }

  const totalStaff = teacherCount + staffCount;
  const hasPending = pendingLeaves > 0 || pendingDiscipline > 0;

  return (
    <WorkspaceBlock title="Xodimlar" icon={Users} action={{ label: 'Batafsil', href: '/dashboard/staff' }}>
      <div className="px-4 py-4 space-y-3">
        {/* Primary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Users className="h-3 w-3 text-xedu-slate-400" />
              <span className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400">O'qituvchilar</span>
            </div>
            <p className="text-lg font-black leading-none text-xedu-slate-900 dark:text-xedu-slate-100">{teacherCount}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <ShieldCheck className="h-3 w-3 text-xedu-slate-400" />
              <span className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400">Boshqa xodimlar</span>
            </div>
            <p className="text-lg font-black leading-none text-xedu-slate-900 dark:text-xedu-slate-100">{staffCount}</p>
          </div>
        </div>

        {/* Capacity summary */}
        <div className="flex items-center justify-between pt-3 border-t border-xedu-border">
          <span className="text-xs text-xedu-slate-500">Jami xodimlar</span>
          <span className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">{totalStaff}</span>
        </div>

        {/* Pending attention */}
        {hasPending && (
          <div className="space-y-1.5">
            {pendingLeaves > 0 && (
              <AttentionRow
                icon={Clock}
                label="Ta'til so'rovlari"
                count={pendingLeaves}
                href="/dashboard/leave-requests"
              />
            )}
            {pendingDiscipline > 0 && (
              <AttentionRow
                icon={AlertTriangle}
                label="Intizom holatlari"
                count={pendingDiscipline}
                href="/dashboard/discipline"
                tone="urgent"
              />
            )}
          </div>
        )}
      </div>
    </WorkspaceBlock>
  );
});

function AttentionRow({
  icon: Icon,
  label,
  count,
  href,
  tone = 'attention',
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  href: string;
  tone?: 'attention' | 'urgent';
}) {
  const dotColor = tone === 'urgent' ? 'bg-xedu-ruby-500' : 'bg-xedu-amber-500';

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2 bg-xedu-slate-50/60 dark:bg-xedu-slate-800/30 hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
        <Icon className="h-3.5 w-3.5 text-xedu-slate-400" />
        <span className="text-xs font-medium text-xedu-slate-700 dark:text-xedu-slate-300">{label}</span>
      </div>
      <span className="text-xs font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">{count}</span>
    </Link>
  );
}
