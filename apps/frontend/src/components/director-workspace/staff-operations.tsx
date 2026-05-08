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
      <WorkspaceBlock title="Xodimlar holati" icon={Users} action={{ label: 'Batafsil', href: '/dashboard/staff' }}>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </WorkspaceBlock>
    );
  }

  const totalStaff = teacherCount + staffCount;
  const hasPending = pendingLeaves > 0 || pendingDiscipline > 0;

  return (
    <WorkspaceBlock title="Xodimlar holati" icon={Users} action={{ label: 'Batafsil', href: '/dashboard/staff' }}>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <StaffPill
            icon={Users}
            label="O'qituvchilar"
            value={teacherCount}
            href="/dashboard/users"
          />
          <StaffPill
            icon={ShieldCheck}
            label="Boshqa xodimlar"
            value={staffCount}
            href="/dashboard/users"
          />
        </div>

        {/* Capacity summary */}
        <div className="rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs text-xedu-slate-500">Jami xodimlar</span>
          <span className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">{totalStaff}</span>
        </div>

        {/* Pending attention */}
        {hasPending && (
          <div className="mt-3 space-y-1.5">
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
        'rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 p-3 transition-colors',
        href && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40 cursor-pointer'
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-xedu-slate-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-xedu-slate-400">{label}</span>
      </div>
      <p className="text-lg font-black leading-none text-xedu-slate-900 dark:text-xedu-slate-100">{value}</p>
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

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2 border border-xedu-slate-100 dark:border-xedu-slate-800 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40 transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <Icon className="h-3.5 w-3.5 text-xedu-slate-400" />
        <span className="text-xs font-medium text-xedu-slate-700 dark:text-xedu-slate-300">{label}</span>
      </div>
      <span className="text-xs font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">{count}</span>
    </Link>
  );
}
