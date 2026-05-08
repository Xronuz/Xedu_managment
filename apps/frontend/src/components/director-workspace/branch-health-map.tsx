'use client';

import { Building2, ChevronRight, Users, GraduationCap, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { BranchDetail } from './right-panel';

interface BranchHealthMapProps {
  branches: BranchDetail[];
  allUsers: any[];
  isLoading: boolean;
  onSelectBranch: (branch: BranchDetail) => void;
}

export function BranchHealthMap({ branches, allUsers, isLoading, onSelectBranch }: BranchHealthMapProps) {
  if (isLoading) {
    return (
      <WorkspaceBlock title="Filiallar holati" icon={Building2}>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </WorkspaceBlock>
    );
  }

  if (!branches || branches.length === 0) {
    return (
      <WorkspaceBlock title="Filiallar holati" icon={Building2} action={{ label: 'Barchasi', href: '/dashboard/branches' }}>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Building2 className="h-6 w-6 text-xedu-slate-300" />
          <p className="text-sm font-medium text-xedu-slate-500">Filiallar mavjud emas</p>
          <p className="text-xs text-xedu-slate-400">Yangi filial qo&apos;shish orqali boshlang</p>
        </div>
      </WorkspaceBlock>
    );
  }

  return (
    <WorkspaceBlock
      title="Filiallar holati"
      icon={Building2}
      action={{ label: 'Barchasi', href: '/dashboard/branches' }}
    >
      <div className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
        {branches.map((branch) => {
          const branchUsers = allUsers.filter((u: any) => u.branchId === branch.id);
          const students = branchUsers.filter((u: any) => u.role === 'student').length;
          const teachers = branchUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length;
          const staff = branchUsers.filter((u: any) => !['student', 'teacher', 'class_teacher', 'parent'].includes(u.role)).length;

          return (
            <button
              key={branch.id}
              onClick={() =>
                onSelectBranch({
                  ...branch,
                  studentCount: students,
                  teacherCount: teachers,
                  staffCount: staff,
                })
              }
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors',
                'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40',
                'focus:outline-none focus:bg-xedu-slate-50 dark:focus:bg-xedu-slate-800/40'
              )}
            >
              {/* Health dot */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    branch.isActive ? 'bg-xedu-primary' : 'bg-red-400'
                  )}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 truncate">
                    {branch.name}
                  </p>
                  {branch.code && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-xedu-slate-100 dark:bg-xedu-slate-800 text-xedu-slate-500 shrink-0">
                      {branch.code}
                    </span>
                  )}
                </div>
                {branch.address && (
                  <p className="text-[11px] text-xedu-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {branch.address}
                  </p>
                )}
              </div>

              {/* Compact counts */}
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <CompactCount icon={GraduationCap} value={students} label="O'quvchilar" />
                <CompactCount icon={Users} value={teachers} label="O'qituvchilar" />
                <CompactCount icon={Users} value={staff} label="Xodimlar" />
              </div>

              {/* Chevron */}
              <ChevronRight className="h-4 w-4 text-xedu-slate-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </WorkspaceBlock>
  );
}

function CompactCount({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <Icon className="h-3 w-3 text-xedu-slate-400" />
      <span className="text-xs font-semibold text-xedu-slate-700 dark:text-xedu-slate-300 tabular-nums">
        {value}
      </span>
    </div>
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
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
