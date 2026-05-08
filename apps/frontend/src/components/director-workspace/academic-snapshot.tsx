'use client';

import { BookOpen, ClipboardCheck, GraduationCap, Calendar, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

export function AcademicSnapshot({
  attendanceSummary,
  classCount = 0,
  activeStudents = 0,
  upcomingExams = 0,
  isLoading,
}: AcademicSnapshotProps) {
  if (isLoading) {
    return (
      <WorkspaceBlock title="Akademik holat" icon={BookOpen} action={{ label: 'Batafsil', href: '/dashboard/education' }}>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>
      </WorkspaceBlock>
    );
  }

  const pct = attendanceSummary?.presentPct ?? 0;
  const totalStudents = attendanceSummary?.totalStudents ?? activeStudents ?? 0;
  const hasAttendance = attendanceSummary != null && (attendanceSummary.marked ?? 0) > 0;

  return (
    <WorkspaceBlock title="Akademik holat" icon={BookOpen} action={{ label: 'Batafsil', href: '/dashboard/education' }}>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Attendance */}
          <AcademicPill
            icon={ClipboardCheck}
            label="Davomat"
            value={hasAttendance ? `${pct}%` : "—"}
            sub={hasAttendance ? `${attendanceSummary?.marked ?? 0} / ${totalStudents}` : "Ma'lumot yo'q"}
            tone={pct < 70 ? 'urgent' : pct < 85 ? 'attention' : 'calm'}
            href="/dashboard/attendance"
          />

          {/* Classes */}
          <AcademicPill
            icon={GraduationCap}
            label="Sinflar"
            value={classCount}
            sub="Faol sinflar"
            href="/dashboard/classes"
          />

          {/* Students */}
          <AcademicPill
            icon={BookOpen}
            label="O'quvchilar"
            value={totalStudents}
            sub="Jami ro'yxatda"
            href="/dashboard/students"
          />

          {/* Exams */}
          <AcademicPill
            icon={Calendar}
            label="Imtihonlar"
            value={upcomingExams > 0 ? upcomingExams : '—'}
            sub={upcomingExams > 0 ? 'Yaqin 7 kun" ichida' : "Rejalashtirilmagan"}
            tone={upcomingExams > 0 ? 'attention' : 'calm'}
            href="/dashboard/exams"
          />
        </div>

        {/* Attendance detail bar */}
        {hasAttendance && (
          <div className="mt-3 pt-3 border-t border-xedu-slate-100 dark:border-xedu-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-xedu-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-xedu-slate-600 dark:text-xedu-slate-400 tabular-nums">{pct}%</span>
            </div>
            <div className="flex items-center gap-4">
              <MiniStat label="Keldi" value={attendanceSummary?.present ?? 0} color="text-xedu-primary" />
              <MiniStat label="Kelmadi" value={attendanceSummary?.absent ?? 0} color="text-red-500" />
              <MiniStat label="Kechikdi" value={attendanceSummary?.late ?? 0} color="text-amber-500" />
            </div>
          </div>
        )}
      </div>
    </WorkspaceBlock>
  );
}

function AcademicPill({
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
    tone === 'urgent' ? 'text-red-600 dark:text-red-400' : tone === 'attention' ? 'text-amber-600 dark:text-amber-400' : 'text-xedu-slate-900 dark:text-xedu-slate-100';

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
      <p className={`text-lg font-black leading-none ${valueColor}`}>{value}</p>
      <p className="text-[11px] text-xedu-slate-500 mt-1">{sub}</p>
    </Wrapper>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[11px] text-xedu-slate-500">{label}</span>
    </div>
  );
}

import { cn } from '@/lib/utils';
