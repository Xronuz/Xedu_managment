'use client';

import { X, Users, GraduationCap, ClipboardCheck, AlertTriangle, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BranchDetail } from './right-panel';

/* ═══════════════════════════════════════════════════════════════════════════════
   BRANCH COMPARISON — Lightweight executive comparison surface
   Select 2+ branches, compare aligned metrics. Compact, table-driven.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface BranchComparisonProps {
  branches: BranchDetail[];
  selectedIds: string[];
  allUsers: any[];
  pendingLeaves?: any[];
  pendingDiscipline?: any[];
  onClose: () => void;
  onRemove: (id: string) => void;
}

export function BranchComparison({
  branches,
  selectedIds,
  allUsers,
  pendingLeaves = [],
  pendingDiscipline = [],
  onClose,
  onRemove,
}: BranchComparisonProps) {
  const selected = branches.filter((b) => selectedIds.includes(b.id));
  if (selected.length < 2) return null;

  const rows = selected.map((branch) => {
    const branchUsers = allUsers.filter((u: any) => u.branchId === branch.id);
    const students = branchUsers.filter((u: any) => u.role === 'student').length;
    const teachers = branchUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length;
    const staff = branchUsers.filter((u: any) => !['student', 'teacher', 'class_teacher', 'parent'].includes(u.role)).length;
    const alerts = pendingDiscipline.filter((d: any) => d.student?.branchId === branch.id).length;
    const pending = pendingLeaves.filter((l: any) => l.requester?.branchId === branch.id).length;
    return { branch, students, teachers, staff, alerts, pending };
  });

  const maxStudents = Math.max(...rows.map((r) => r.students), 1);
  const maxTeachers = Math.max(...rows.map((r) => r.teachers), 1);

  return (
    <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-slate-50/50 dark:bg-xedu-slate-800/20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-xedu-slate-500">
            Filial taqqoslash
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-xedu-slate-200 dark:bg-xedu-slate-700 text-xedu-slate-700 dark:text-xedu-slate-300">
            {selected.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-[10px] font-semibold text-xedu-slate-500 hover:text-xedu-slate-800 transition-colors"
        >
          <X className="h-3 w-3" />
          Yopish
        </button>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-xedu-slate-100 dark:border-xedu-slate-800">
              <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-xedu-slate-400 whitespace-nowrap">Ko'rsatkich</th>
              {rows.map(({ branch }) => (
                <th key={branch.id} className="px-3 py-2 text-[11px] font-bold text-xedu-slate-700 dark:text-xedu-slate-300 whitespace-nowrap min-w-[80px]">
                  <div className="flex items-center gap-1">
                    {branch.name}
                    <button
                      onClick={() => onRemove(branch.id)}
                      className="ml-1 text-xedu-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
            <CompareRow
              label="O'quvchilar"
              icon={GraduationCap}
              rows={rows}
              getValue={(r) => r.students}
              getBar={(r) => (r.students / maxStudents) * 100}
            />
            <CompareRow
              label="O'qituvchilar"
              icon={Users}
              rows={rows}
              getValue={(r) => r.teachers}
              getBar={(r) => (r.teachers / maxTeachers) * 100}
            />
            <CompareRow
              label="Xodimlar"
              icon={Users}
              rows={rows}
              getValue={(r) => r.staff}
            />
            <CompareRow
              label="Intizom"
              icon={AlertTriangle}
              rows={rows}
              getValue={(r) => r.alerts}
              tone="urgent"
              highlight={(v) => v > 0}
            />
            <CompareRow
              label="Tasdiqlash"
              icon={ClipboardCheck}
              rows={rows}
              getValue={(r) => r.pending}
              tone="attention"
              highlight={(v) => v > 0}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  icon: Icon,
  rows,
  getValue,
  getBar,
  tone,
  highlight,
}: {
  label: string;
  icon: React.ElementType;
  rows: any[];
  getValue: (r: any) => number;
  getBar?: (r: any) => number;
  tone?: 'urgent' | 'attention';
  highlight?: (v: number) => boolean;
}) {
  const maxVal = Math.max(...rows.map((r) => getValue(r)), 1);

  return (
    <tr>
      <td className="px-3 py-2 text-[11px] font-medium text-xedu-slate-500 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-xedu-slate-400" />
          {label}
        </div>
      </td>
      {rows.map(({ branch }) => {
        const value = getValue({ branch, ...rows.find((r) => r.branch.id === branch.id) });
        const isMax = value === maxVal && value > 0;
        const shouldHighlight = highlight ? highlight(value) : false;

        return (
          <td key={branch.id} className="px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-[13px] font-bold tabular-nums',
                shouldHighlight && tone === 'urgent' ? 'text-red-600' :
                shouldHighlight && tone === 'attention' ? 'text-amber-600' :
                isMax ? 'text-xedu-primary' : 'text-xedu-slate-800 dark:text-xedu-slate-200'
              )}>
                {value}
              </span>
              {getBar && (
                <div className="flex-1 h-1 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden max-w-[60px]">
                  <div
                    className={cn('h-full rounded-full', isMax ? 'bg-xedu-primary' : 'bg-xedu-slate-300')}
                    style={{ width: `${getBar(rows.find((r) => r.branch.id === branch.id)!)}%` }}
                  />
                </div>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}
