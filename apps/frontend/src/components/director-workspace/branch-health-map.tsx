'use client';

import { useState, useMemo, memo } from 'react';
import {
  Building2, ChevronRight, Users, GraduationCap, MapPin,
  Eye, FileText, AlertTriangle, Clock, BarChart3,
  CheckSquare, Square, GitCompare,
} from 'lucide-react';
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
  compareMode?: boolean;
  compareSelected?: string[];
  onSelectBranch: (branch: BranchDetail) => void;
  onToggleCompare?: (id: string) => void;
}

export const BranchHealthMap = memo(function BranchHealthMap({
  branches,
  allUsers,
  pendingLeaves = [],
  pendingDiscipline = [],
  isLoading,
  selectedBranchId,
  compareMode = false,
  compareSelected = [],
  onSelectBranch,
  onToggleCompare,
}: BranchHealthMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ── Precompute branch metrics in O(n) instead of O(n²) ──────────────
  const branchMetrics = useMemo(() => {
    const metrics = new Map<string, {
      students: number;
      teachers: number;
      staff: number;
      alerts: number;
      pending: number;
    }>();

    // Index users by branch
    const usersByBranch = new Map<string, any[]>();
    for (const u of allUsers) {
      if (!u.branchId) continue;
      const list = usersByBranch.get(u.branchId);
      if (list) list.push(u);
      else usersByBranch.set(u.branchId, [u]);
    }

    // Index discipline by branch
    const disciplineByBranch = new Map<string, number>();
    for (const d of pendingDiscipline) {
      const bid = d.student?.branchId;
      if (bid) disciplineByBranch.set(bid, (disciplineByBranch.get(bid) || 0) + 1);
    }

    // Index leaves by branch
    const leavesByBranch = new Map<string, number>();
    for (const l of pendingLeaves) {
      const bid = l.requester?.branchId;
      if (bid) leavesByBranch.set(bid, (leavesByBranch.get(bid) || 0) + 1);
    }

    for (const branch of branches) {
      const branchUsers = usersByBranch.get(branch.id) || [];
      let students = 0, teachers = 0, staff = 0;
      for (const u of branchUsers) {
        if (u.role === 'student') students++;
        else if (u.role === 'teacher' || u.role === 'class_teacher') teachers++;
        else if (u.role !== 'parent') staff++;
      }
      metrics.set(branch.id, {
        students,
        teachers,
        staff,
        alerts: disciplineByBranch.get(branch.id) || 0,
        pending: leavesByBranch.get(branch.id) || 0,
      });
    }

    return metrics;
  }, [branches, allUsers, pendingDiscipline, pendingLeaves]);

  if (isLoading) {
    return (
      <WorkspaceBlock title="Filiallar" icon={Building2}>
        <div className="space-y-0">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[52px] rounded-none" />
          ))}
        </div>
      </WorkspaceBlock>
    );
  }

  if (!branches || branches.length === 0) {
    return (
      <WorkspaceBlock title="Filiallar" icon={Building2} action={{ label: 'Barchasi', href: '/dashboard/branches' }}>
        <div className="flex flex-col items-center justify-center py-7 gap-1.5">
          <Building2 className="h-5 w-5 text-xedu-slate-300" />
          <p className="text-sm font-medium text-xedu-slate-500">Filiallar mavjud emas</p>
        </div>
      </WorkspaceBlock>
    );
  }

  return (
    <WorkspaceBlock
      title="Filiallar"
      icon={Building2}
      action={{ label: 'Barchasi', href: '/dashboard/branches' }}
    >
      <div className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
        {branches.map((branch) => {
          const m = branchMetrics.get(branch.id)!;
          const { students, teachers, staff, alerts: branchAlerts, pending: branchPending } = m;

          const hasAttention = branchAlerts > 0 || branchPending > 0;
          const isSelected = selectedBranchId === branch.id;
          const isHovered = hoveredId === branch.id;
          const isCompared = compareSelected.includes(branch.id);

          // Operational pressure score
          const pressureScore = (branchAlerts * 2 + branchPending) / Math.max(students + teachers, 1);
          const pressureLevel = pressureScore > 0.1 ? 'critical' : pressureScore > 0.03 ? 'elevated' : 'normal';

          const branchWithCounts: BranchDetail = {
            ...branch,
            studentCount: students,
            teacherCount: teachers,
            staffCount: staff,
          };

          return (
            <div
              key={branch.id}
              onMouseEnter={() => setHoveredId(branch.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectBranch(branchWithCounts)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBranch(branchWithCounts);
                }
              }}
              role="button"
              tabIndex={0}
              className={cn(
                'relative flex items-center gap-3 px-4 py-3.5 min-h-[60px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary focus-visible:ring-inset',
                isSelected
                  ? 'bg-xedu-bg-panel border-l-2 border-l-xedu-primary'
                  : 'border-l-2 border-l-transparent hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40',
              )}
            >
              {/* Compare checkbox */}
              {compareMode && onToggleCompare && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleCompare(branch.id); }}
                  className="shrink-0"
                >
                  {isCompared ? (
                    <CheckSquare className="h-4 w-4 text-xedu-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-xedu-slate-300" />
                  )}
                </button>
              )}

              {/* Health dot — primary signal */}
              <div className="shrink-0 relative">
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    branch.isActive ? 'bg-xedu-primary' : 'bg-xedu-ruby-400'
                  )}
                />
                {hasAttention && (
                  <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-xedu-ruby-400 animate-ping opacity-40" />
                )}
              </div>

              {/* Name + metadata — left */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 truncate leading-tight">
                  {branch.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {branch.address && (
                    <span className="text-2xs text-xedu-slate-400 truncate">
                      {branch.address}
                    </span>
                  )}
                  {branch.code && (
                    <span className="text-2xs text-xedu-slate-400 shrink-0">
                      {branch.code}
                    </span>
                  )}
                </div>
              </div>

              {/* Key metrics — right, aligned */}
              <div className="hidden md:flex items-baseline gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-sm font-bold tabular-nums text-xedu-slate-900 dark:text-xedu-slate-100">
                    {students.toLocaleString()}
                  </span>
                  <span className="text-2xs text-xedu-slate-400 ml-1">o&apos;quvchi</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold tabular-nums text-xedu-slate-500">
                    {teachers}
                  </span>
                  <span className="text-2xs text-xedu-slate-400 ml-1">o&apos;qituvchi</span>
                </div>
                {branchAlerts > 0 && (
                  <span className="flex items-center gap-0.5 text-2xs font-bold text-xedu-ruby-500 shrink-0">
                    <AlertTriangle className="h-3 w-3" />
                    {branchAlerts}
                  </span>
                )}
                {branchPending > 0 && (
                  <span className="flex items-center gap-0.5 text-2xs font-bold text-xedu-amber-500 shrink-0">
                    <Clock className="h-3 w-3" />
                    {branchPending}
                  </span>
                )}
              </div>

              {/* Inline hover actions */}
              <div
                className={cn(
                  'hidden lg:flex items-center gap-1 shrink-0 transition-opacity duration-200',
                  isHovered || isSelected ? 'opacity-100' : 'opacity-0'
                )}
              >
                <ActionBtn
                  icon={Eye}
                  label="Ko'rish"
                  onClick={() => onSelectBranch(branchWithCounts)}
                />
                <ActionBtn
                  icon={FileText}
                  label="Hisobot"
                  href={`/dashboard/branches/${branch.id}`}
                />
                {compareMode && onToggleCompare && (
                  <ActionBtn
                    icon={GitCompare}
                    label={isCompared ? 'Olib tashlash' : 'Taqqoslash'}
                    onClick={() => onToggleCompare(branch.id)}
                  />
                )}
              </div>

              {/* Chevron */}
              <div
                className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center"
                aria-hidden="true"
              >
                <ChevronRight className="h-4 w-4 text-xedu-slate-300" />
              </div>
            </div>
          );
        })}
      </div>
    </WorkspaceBlock>
  );
});

function OpIndicator({
  icon: Icon,
  value,
  tone = 'calm',
}: {
  icon: React.ElementType;
  value: number;
  tone?: 'calm' | 'attention' | 'urgent';
}) {
  const color =
    tone === 'urgent' ? 'text-xedu-ruby-500' :
    tone === 'attention' ? 'text-xedu-amber-500' :
    'text-xedu-slate-400';

  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold tabular-nums">
      <Icon className={cn('h-3 w-3', color)} />
      <span className={color}>{value}</span>
    </span>
  );
}

const ActionBtn = memo(function ActionBtn({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const Wrapper = href ? Link : 'button';
  const props = href ? { href } : { onClick };

  return (
    <Wrapper
      {...(props as any)}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-xedu-slate-500 hover:text-xedu-primary hover:bg-xedu-primary-light/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary focus-visible:ring-offset-1"
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </Wrapper>
  );
});

interface WorkspaceBlockProps {
  title: string;
  icon: React.ElementType;
  action?: { label: string; href: string };
  children: React.ReactNode;
}

export const WorkspaceBlock = memo(function WorkspaceBlock({ title, icon: Icon, action, children }: WorkspaceBlockProps) {
  return (
    <div className="rounded-xl border border-xedu-border bg-xedu-bg-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-xedu-border bg-xedu-slate-50/50 dark:bg-xedu-slate-900/20">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-xedu-slate-500" />
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
