'use client';

import React, { memo } from 'react';
import { BookOpen, ClipboardCheck, GraduationCap, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { WorkspaceBlock } from './branch-health-map';
import Link from 'next/link';

interface AcademicSnapshotProps {
  attendanceSummary?: {
    presentPct?: number;
    totalStudents?: number;
    marked?: number;
    present?: number;
    absent?: number;
    late?: number;
  } | null;
  classCount?: number;
  activeStudents?: number;
  upcomingExams?: number;
  isLoading: boolean;
}

export const AcademicSnapshot = memo(function AcademicSnapshot({
  attendanceSummary,
  classCount = 0,
  activeStudents = 0,
  upcomingExams = 0,
  isLoading,
}: AcademicSnapshotProps) {
  if (isLoading) {
    return (
      <WorkspaceBlock title="Akademik" icon={BookOpen} action={{ label: 'Batafsil', href: '/dashboard/education' }}>
        <div className="p-4 space-y-3">
          <div className="flex gap-4">
            <Skeleton className="h-14 flex-1 rounded-md" />
            <Skeleton className="h-14 flex-1 rounded-md" />
            <Skeleton className="h-14 flex-1 rounded-md" />
            <Skeleton className="h-14 flex-1 rounded-md" />
          </div>
        </div>
      </WorkspaceBlock>
    );
  }

  const pct = attendanceSummary?.presentPct ?? 0;
  const totalStudents = attendanceSummary?.totalStudents ?? activeStudents ?? 0;
  const hasAttendance = attendanceSummary != null && (attendanceSummary.marked ?? 0) > 0;

  return (
    <WorkspaceBlock title="Akademik" icon={BookOpen} action={{ label: 'Batafsil', href: '/dashboard/education' }}>
      <div className="px-4 py-4 space-y-3">
        {/* Primary stats — clean grid */}
        <div className="grid grid-cols-4 gap-4">
          <AcadStat
            icon={ClipboardCheck}
            label="Davomat"
            value={hasAttendance ? `${pct}%` : '—'}
            sub={hasAttendance ? `${attendanceSummary?.marked ?? 0} / ${totalStudents}` : "Ma'lumot yo'q"}
            tone={pct < 70 ? 'urgent' : pct < 85 ? 'attention' : 'calm'}
            href="/dashboard/attendance"
          />
          <AcadStat
            icon={GraduationCap}
            label="Sinflar"
            value={classCount}
            sub="Faol"
            href="/dashboard/classes"
          />
          <AcadStat
            icon={BookOpen}
            label="O'quvchilar"
            value={totalStudents}
            sub="Jami"
            href="/dashboard/students"
          />
          <AcadStat
            icon={Calendar}
            label="Imtihonlar"
            value={upcomingExams > 0 ? upcomingExams : '—'}
            sub={upcomingExams > 0 ? 'Yaqin 7 kunda' : 'Rejalashtirilmagan'}
            tone={upcomingExams > 0 ? 'attention' : 'calm'}
            href="/dashboard/exams"
          />
        </div>

        {/* Attendance detail */}
        {hasAttendance && (
          <div className="pt-3 border-t border-xedu-border space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-xedu-primary transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-xedu-slate-500 tabular-nums shrink-0">{pct}%</span>
            </div>
            <div className="flex items-center gap-4">
              <MiniStat label="Keldi" value={attendanceSummary?.present ?? 0} color="text-xedu-primary" />
              <MiniStat label="Kelmadi" value={attendanceSummary?.absent ?? 0} color="text-xedu-ruby-500" />
              <MiniStat label="Kechikdi" value={attendanceSummary?.late ?? 0} color="text-xedu-amber-500" />
            </div>
          </div>
        )}
      </div>
    </WorkspaceBlock>
  );
});

function AcadStat({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'calm',
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  tone?: 'calm' | 'attention' | 'urgent';
  href?: string;
}) {
  const valueColor =
    tone === 'urgent'
      ? 'text-xedu-ruby-600 dark:text-xedu-ruby-400'
      : tone === 'attention'
      ? 'text-xedu-amber-600 dark:text-xedu-amber-400'
      : 'text-xedu-slate-900 dark:text-xedu-slate-100';

  const Wrapper = href ? Link : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'transition-colors',
        href && 'hover:opacity-80 cursor-pointer'
      )}
    >
      <div className="flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3 text-xedu-slate-400" />
        <span className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400">{label}</span>
      </div>
      <p className={`text-lg font-black leading-none ${valueColor}`}>{value}</p>
      <p className="text-2xs text-xedu-slate-500 mt-1 leading-tight">{sub}</p>
    </Wrapper>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-2xs text-xedu-slate-500">{label}</span>
    </div>
  );
}
