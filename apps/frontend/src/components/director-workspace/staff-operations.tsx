'use client';

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

export function StaffOperations({
  teacherCount = 0,
  staffCount = 0,
  pendingLeaves = 0,
  pendingDiscipline = 0,
  isLoading,
}: StaffOperationsProps) {
  if (isLoading) {
    return (
      <WorkspaceBlock title="Xodimlar" icon={Users} action={{ label: 'Batafsil', href: '/dashboard/staff' }}>
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
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
      <div className="px-3 py-2">
        <div className="flex gap-1.5 mb-1.5">
          <StaffPill icon={Users} label="O'qituvchilar" value={teacherCount} href="/dashboard/users" />
          <StaffPill icon={ShieldCheck} label="Boshqa xodimlar" value={staffCount} href="/dashboard/users" />
        </div>

        {/* Capacity summary */}
        <div className="rounded-md border border-xedu-slate-100 dark:border-xedu-slate-800 px-2 py-1 flex items-center justify-between">
          <span className="text-[11px] text-xedu-slate-500">Jami xodimlar</span>
          <span className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">{totalStaff}</span>
        </div>

        {/* Pending attention */}
        {hasPending && (
          <div className="mt-1.5 space-y-1">
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
}

function StaffPill({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  href?: string;
}) {
  const Wrapper = href ? Link : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'flex-1 rounded-md border border-xedu-slate-100 dark:border-xedu-slate-800 p-2 transition-colors',
        href && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40 cursor-pointer'
      )}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3 text-xedu-slate-400" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-xedu-slate-400">{label}</span>
      </div>
      <p className="text-sm font-black leading-none text-xedu-slate-900 dark:text-xedu-slate-100">{value}</p>
    </Wrapper>
  );
}

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
  const dotColor = tone === 'urgent' ? 'bg-red-500' : 'bg-amber-500';
  const bgColor = tone === 'urgent'
    ? 'hover:bg-red-50 dark:hover:bg-red-900/10'
    : 'hover:bg-amber-50 dark:hover:bg-amber-900/10';

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between rounded-md px-2.5 py-1.5 border border-xedu-slate-100 dark:border-xedu-slate-800 transition-colors',
        bgColor
      )}
    >
      <div className="flex items-center gap-1.5">
        <div className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
        <Icon className="h-3 w-3 text-xedu-slate-400" />
        <span className="text-[11px] font-medium text-xedu-slate-700 dark:text-xedu-slate-300">{label}</span>
      </div>
      <span className="text-[11px] font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">{count}</span>
    </Link>
  );
}
