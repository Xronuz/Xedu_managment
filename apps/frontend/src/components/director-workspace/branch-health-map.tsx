'use client';

import { useMemo, memo } from 'react';
import { Building2, ChevronRight, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { BranchDetail } from './right-panel';

interface BranchHealthMapProps {
  branches: BranchDetail[];
  allUsers: any[];
  pendingLeaves?: any[];
  pendingDiscipline?: any[];
  isLoading: boolean;
  selectedBranchId?: string | null;
  onSelectBranch: (branch: BranchDetail) => void;
}

export const BranchHealthMap = memo(function BranchHealthMap({
  branches,
  allUsers,
  pendingLeaves = [],
  pendingDiscipline = [],
  isLoading,
  selectedBranchId,
  onSelectBranch,
}: BranchHealthMapProps) {

  const branchMetrics = useMemo(() => {
    const metrics = new Map<string, { students: number; teachers: number; staff: number; alerts: number }>();

    const usersByBranch = new Map<string, any[]>();
    for (const u of allUsers) {
      const bid = u.branchId ?? u.branch?.id;
      if (!bid) continue;
      const list = usersByBranch.get(bid);
      if (list) list.push(u);
      else usersByBranch.set(bid, [u]);
    }

    const disciplineByBranch = new Map<string, number>();
    for (const d of pendingDiscipline) {
      const bid = d.student?.branchId ?? d.student?.branch?.id;
      if (bid) disciplineByBranch.set(bid, (disciplineByBranch.get(bid) || 0) + 1);
    }

    for (const branch of branches) {
      const branchUsers = usersByBranch.get(branch.id) || [];
      let students = 0, teachers = 0, staff = 0;
      for (const u of branchUsers) {
        if (u.role === 'student') students++;
        else if (u.role === 'teacher' || u.role === 'class_teacher') teachers++;
        else if (u.role !== 'parent') staff++;
      }
      metrics.set(branch.id, { students, teachers, staff, alerts: disciplineByBranch.get(branch.id) || 0 });
    }
    return metrics;
  }, [branches, allUsers, pendingDiscipline]);

  if (isLoading) {
    return (
      <WorkspaceBlock title="Filiallar" action={{ label: 'Barchasi', href: '/dashboard/branches' }}>
        <div className="space-y-0">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-none" />)}
        </div>
      </WorkspaceBlock>
    );
  }

  if (!branches || branches.length === 0) {
    return (
      <WorkspaceBlock title="Filiallar" action={{ label: 'Barchasi', href: '/dashboard/branches' }}>
        <div className="flex flex-col items-center justify-center py-7 gap-1.5">
          <Building2 className="h-5 w-5 text-xedu-slate-300" />
          <p className="text-sm font-medium text-xedu-slate-500">Filiallar mavjud emas</p>
        </div>
      </WorkspaceBlock>
    );
  }

  const maxStudents = Math.max(...branches.map(b => branchMetrics.get(b.id)?.students ?? 0), 1);
  const maxTeachers = Math.max(...branches.map(b => branchMetrics.get(b.id)?.teachers ?? 0), 1);

  return (
    <WorkspaceBlock title="Filiallar" action={{ label: 'Barchasi', href: '/dashboard/branches' }}>
      {/* Column headers */}
      <div className="hidden md:grid grid-cols-[1fr_100px_100px_72px_32px] gap-2 px-4 py-2 border-b border-xedu-border bg-xedu-slate-50/60 dark:bg-xedu-slate-900/10">
        <span className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400">Filial</span>
        <span className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400 text-right">O'quvchi</span>
        <span className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400 text-right">O'qituvchi</span>
        <span className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400 text-right">Intizom</span>
        <span />
      </div>

      <div className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
        {branches.map((branch) => {
          const m = branchMetrics.get(branch.id) ?? { students: 0, teachers: 0, staff: 0, alerts: 0 };
          const isSelected = selectedBranchId === branch.id;

          const branchWithCounts: BranchDetail = {
            ...branch,
            studentCount: m.students,
            teacherCount: m.teachers,
            staffCount: m.staff,
          };

          return (
            <div
              key={branch.id}
              onClick={() => onSelectBranch(branchWithCounts)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectBranch(branchWithCounts); }
              }}
              role="button"
              tabIndex={0}
              className={cn(
                'grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_100px_72px_32px] gap-2 items-center px-4 py-3.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary focus-visible:ring-inset',
                isSelected
                  ? 'bg-xedu-bg-panel border-l-2 border-l-xedu-primary'
                  : 'border-l-2 border-l-transparent hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40',
              )}
            >
              {/* Branch name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className={cn('h-2.5 w-2.5 rounded-full', branch.isActive ? 'bg-xedu-primary' : 'bg-xedu-ruby-400')} />
                  {m.alerts > 0 && (
                    <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-xedu-ruby-400 animate-ping opacity-40" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 truncate leading-tight">
                    {branch.name}
                  </p>
                  {branch.code && (
                    <span className="text-2xs text-xedu-slate-400">{branch.code}</span>
                  )}
                </div>
              </div>

              {/* O'quvchi */}
              <MetricCell value={m.students} max={maxStudents} />

              {/* O'qituvchi */}
              <MetricCell value={m.teachers} max={maxTeachers} />

              {/* Intizom */}
              <div className="hidden md:flex justify-end">
                {m.alerts > 0 ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-xedu-ruby-500">
                    <AlertTriangle className="h-3 w-3" />
                    {m.alerts}
                  </span>
                ) : (
                  <span className="text-2xs text-xedu-slate-300">—</span>
                )}
              </div>

              {/* Chevron */}
              <div className="flex justify-end" aria-hidden="true">
                <ChevronRight className="h-4 w-4 text-xedu-slate-300" />
              </div>
            </div>
          );
        })}
      </div>
    </WorkspaceBlock>
  );
});

const MetricCell = memo(function MetricCell({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="hidden md:flex flex-col items-end gap-1">
      <span className="text-sm font-bold tabular-nums text-xedu-slate-800 dark:text-xedu-slate-100 leading-none">
        {value.toLocaleString()}
      </span>
      <div className="w-16 h-1 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-xedu-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

interface WorkspaceBlockProps {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}

export const WorkspaceBlock = memo(function WorkspaceBlock({ title, action, children }: WorkspaceBlockProps) {
  return (
    <div className="rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-xedu-border bg-xedu-slate-50/50 dark:bg-xedu-slate-900/20">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-xedu-slate-500" />
          <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{title}</h3>
        </div>
        {action && (
          <Link
            href={action.href}
            className="text-xs font-semibold text-xedu-primary hover:text-xedu-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary focus-visible:ring-offset-1 rounded-md px-1 py-0.5"
          >
            {action.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
});
