'use client';

import { useState } from 'react';
import {
  Building2, ChevronRight, Users, GraduationCap, MapPin,
  Eye, FileText, AlertTriangle, Clock, TrendingUp,
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
  onSelectBranch: (branch: BranchDetail) => void;
}

export function BranchHealthMap({
  branches,
  allUsers,
  pendingLeaves = [],
  pendingDiscipline = [],
  isLoading,
  selectedBranchId,
  onSelectBranch,
}: BranchHealthMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
          const branchUsers = allUsers.filter((u: any) => u.branchId === branch.id);
          const students = branchUsers.filter((u: any) => u.role === 'student').length;
          const teachers = branchUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length;
          const staff = branchUsers.filter((u: any) => !['student', 'teacher', 'class_teacher', 'parent'].includes(u.role)).length;

          const branchAlerts = pendingDiscipline.filter((d: any) => d.student?.branchId === branch.id).length;
          const branchPending = pendingLeaves.filter((l: any) => l.requester?.branchId === branch.id).length;
          const hasAttention = branchAlerts > 0 || branchPending > 0;
          const isSelected = selectedBranchId === branch.id;
          const isHovered = hoveredId === branch.id;

          return (
            <div
              key={branch.id}
              onMouseEnter={() => setHoveredId(branch.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                'relative flex items-center gap-2 px-3 py-2.5 transition-colors',
                isSelected
                  ? 'bg-xedu-primary-light/30 border-l-2 border-l-xedu-primary'
                  : 'border-l-2 border-l-transparent hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40',
              )}
            >
              {/* Health dot with pulse for attention */}
              <div className="shrink-0 flex flex-col items-center gap-0.5 w-4">
                <div className="relative">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      branch.isActive ? 'bg-xedu-primary' : 'bg-red-400'
                    )}
                  />
                  {hasAttention && (
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-red-400 animate-ping opacity-40" />
                  )}
                </div>
              </div>

              {/* Info block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 truncate">
                    {branch.name}
                  </p>
                  {branch.code && (
                    <span className="text-[10px] font-medium px-1 py-0 rounded bg-xedu-slate-100 dark:bg-xedu-slate-800 text-xedu-slate-500 shrink-0">
                      {branch.code}
                    </span>
                  )}
                  {hasAttention && (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-red-500">
                      <AlertTriangle className="h-3 w-3" />
                      {branchAlerts + branchPending}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {branch.address && (
                    <p className="text-[11px] text-xedu-slate-500 truncate flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      {branch.address}
                    </p>
                  )}
                  {/* Operational micro-indicators */}
                  <div className="hidden md:flex items-center gap-2">
                    <OpIndicator icon={GraduationCap} value={students} />
                    <OpIndicator icon={Users} value={teachers} />
                    <OpIndicator icon={Users} value={staff} />
                  </div>
                </div>
              </div>

              {/* Inline hover actions */}
              <div
                className={cn(
                  'hidden lg:flex items-center gap-1 shrink-0 transition-opacity duration-150',
                  isHovered || isSelected ? 'opacity-100' : 'opacity-0'
                )}
              >
                <ActionBtn
                  icon={Eye}
                  label="Ko'rish"
                  onClick={() =>
                    onSelectBranch({
                      ...branch,
                      studentCount: students,
                      teacherCount: teachers,
                      staffCount: staff,
                    })
                  }
                />
                <ActionBtn
                  icon={FileText}
                  label="Hisobot"
                  href={`/dashboard/branches/${branch.id}`}
                />
              </div>

              {/* Chevron + mobile tap target */}
              <button
                onClick={() =>
                  onSelectBranch({
                    ...branch,
                    studentCount: students,
                    teacherCount: teachers,
                    staffCount: staff,
                  })
                }
                className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-xedu-slate-300" />
              </button>
            </div>
          );
        })}
      </div>
    </WorkspaceBlock>
  );
}

function OpIndicator({ icon: Icon, value }: { icon: React.ElementType; value: number }) {
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-xedu-slate-400 tabular-nums">
      <Icon className="h-2.5 w-2.5" />
      {value}
    </span>
  );
}

function ActionBtn({
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
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-xedu-slate-500 hover:text-xedu-primary hover:bg-xedu-primary-light/40 transition-colors"
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </Wrapper>
  );
}

interface WorkspaceBlockProps {
  title: string;
  icon: React.ElementType;
  action?: { label: string; href: string };
  children: React.ReactNode;
}

export function WorkspaceBlock({ title, icon: Icon, action, children }: WorkspaceBlockProps) {
  return (
    <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-xedu-slate-500" />
          <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{title}</h3>
        </div>
        {action && (
          <Link
            href={action.href}
            className="text-[11px] font-semibold text-xedu-primary hover:text-xedu-primary-hover transition-colors"
          >
            {action.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
