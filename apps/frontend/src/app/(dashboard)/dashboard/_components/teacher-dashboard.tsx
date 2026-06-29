'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users, School, ClipboardCheck, Calendar, GraduationCap,
  BookOpen, BookMarked, Clock, AlertCircle, ArrowUpRight,
  CheckCircle2, BarChart2, Sparkles, FileText, Brain,
} from 'lucide-react';
import { AiPlaceholderCard } from '@/components/ai/ai-placeholder-card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';
import { getRoleLabel } from '@/lib/utils';

import { classesApi } from '@/lib/api/classes';
import { attendanceApi } from '@/lib/api/attendance';
import { examsApi } from '@/lib/api/exams';
import { gradesApi } from '@/lib/api/grades';
import { subjectsApi } from '@/lib/api/subjects';

import {
  C, ICON_CFG, StatCard, PCard, QuickActions,
  TodayScheduleWidget, AttendanceSummaryWidget, UpcomingExamsWidget,
  ClassTeacherMyClassSection, TeacherKPISection,
  AcademicCalendarWidget,
} from './shared-widgets';

export function TeacherDashboard() {
  const { user, activeBranchId } = useAuthStore();
  const isClassTeacher = user?.role === 'class_teacher';

  const dayLabel = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const today = new Date().toISOString().split('T')[0];

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', 'teacher', activeBranchId],
    queryFn: classesApi.getAll,
  });

  const { data: mySubjectsData } = useQuery({
    queryKey: ['subjects', 'mine', activeBranchId],
    queryFn: () => subjectsApi.getMine(),
  });

  const { data: upcomingExams } = useQuery({
    queryKey: ['exams', 'upcoming', 'teacher', activeBranchId],
    queryFn: () => examsApi.getUpcoming(14),
    enabled: !!activeBranchId,
  });

  const classList: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const mySubjects: any[] = Array.isArray(mySubjectsData) ? mySubjectsData : [];
  const mySubjectClassIds = new Set(mySubjects.map((s: any) => s.classId).filter(Boolean));
  const myClasses = classList.filter((c: any) =>
    c.classTeacherId === user?.id || mySubjectClassIds.has(c.id)
  );

  const examsList: any[] = Array.isArray(upcomingExams) ? upcomingExams : (upcomingExams as any)?.data ?? [];
  const nextExamsCount = examsList.length;
  const todaysLessonsCount = myClasses.length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[32px] font-black tracking-tight leading-none" style={{ color: C.text }}>
          Mening ish stolim
        </h1>
        <p className="text-sm mt-2 font-medium" style={{ color: C.muted }}>
          {getRoleLabel(user?.role ?? '')} &middot; {dayLabel}
        </p>
      </div>

      {/* ── Today's schedule (prominent) ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <TodayScheduleWidget />
        </div>
        <div className="space-y-4">
          <StatCard
            title="Mening sinflarim"
            value={todaysLessonsCount}
            icon={Clock}
            description="Jadval bo'yicha"
            color="blue"
            loading={classesLoading}
          />
          <StatCard
            title="Uy vazifalari"
            value={todaysLessonsCount}
            icon={BookMarked}
            description="Faol topshiriqlar"
            color="amber"
            href="/dashboard/homework"
          />
          <StatCard
            title="Yaqin imtihonlar"
            value={nextExamsCount}
            icon={GraduationCap}
            description="2 hafta ichida"
            color="violet"
            href="/dashboard/exams"
          />
        </div>
      </div>

      {/* ── Quick actions row ── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Link
          href="/dashboard/attendance"
          className="group flex items-center gap-3 rounded-2xl border border-xedu-slate-100 bg-xedu-bg-elevated p-4 transition-all duration-[var(--xedu-duration)] hover:border-xedu-slate-200 hover:shadow-sm dark:border-xedu-slate-800"
        >
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--xedu-primary-light)' }}>
            <ClipboardCheck className="h-5 w-5" style={{ color: C.primary }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: C.text }}>Davomat</p>
            <p className="text-xs" style={{ color: C.muted }}>Belgilash</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-xedu-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <Link
          href="/dashboard/grades"
          className="group flex items-center gap-3 rounded-2xl border border-xedu-slate-100 bg-xedu-bg-elevated p-4 transition-all duration-[var(--xedu-duration)] hover:border-xedu-slate-200 hover:shadow-sm dark:border-xedu-slate-800"
        >
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: ICON_CFG.blue.bg }}>
            <BookOpen className="h-5 w-5" style={{ color: ICON_CFG.blue.icon }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: C.text }}>Baholar</p>
            <p className="text-xs" style={{ color: C.muted }}>Qo&apos;shish</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-xedu-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <Link
          href="/dashboard/homework"
          className="group flex items-center gap-3 rounded-2xl border border-xedu-slate-100 bg-xedu-bg-elevated p-4 transition-all duration-[var(--xedu-duration)] hover:border-xedu-slate-200 hover:shadow-sm dark:border-xedu-slate-800"
        >
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: ICON_CFG.violet.bg }}>
            <BookMarked className="h-5 w-5" style={{ color: ICON_CFG.violet.icon }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: C.text }}>Uy vazifasi</p>
            <p className="text-xs" style={{ color: C.muted }}>Yaratish</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-xedu-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <Link
          href="/dashboard/exams"
          className="group flex items-center gap-3 rounded-2xl border border-xedu-slate-100 bg-xedu-bg-elevated p-4 transition-all duration-[var(--xedu-duration)] hover:border-xedu-slate-200 hover:shadow-sm dark:border-xedu-slate-800"
        >
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FEF3C7' }}>
            <GraduationCap className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: C.text }}>Imtihon</p>
            <p className="text-xs" style={{ color: C.muted }}>Boshqarish</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-xedu-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      {/* ── Middle section ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <AttendanceSummaryWidget />
        <UpcomingExamsWidget />
      </div>

      {/* ── Class teacher section ── */}
      {isClassTeacher && <ClassTeacherMyClassSection />}

      {/* ── Teacher KPIs ── */}
      <TeacherKPISection />

      {/* ── My classes list ── */}
      {myClasses.length > 0 && (
        <PCard>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>Mening sinflarim</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{myClasses.length} ta sinf</p>
            </div>
            <Link href="/dashboard/classes" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</Link>
          </div>
          <div className="space-y-2">
            {myClasses.slice(0, 6).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--xedu-primary-light)' }}>
                    <School className="h-4 w-4" style={{ color: C.primary }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: C.text }}>{c.name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{c._count?.students ?? 0} o'quvchi</p>
                  </div>
                </div>
                <Badge variant={c.classTeacherId === user?.id ? 'default' : 'secondary'}>
                  {c.classTeacherId === user?.id ? 'Sinf rahbari' : "O'qituvchi"}
                </Badge>
              </div>
            ))}
          </div>
        </PCard>
      )}

      {/* ── AI Placeholders ── */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">AI yordamchilar</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <AiPlaceholderCard
            title="AI imtihon yordamchisi"
            description="Avtomatik imtihon savollari yaratish"
            icon={<FileText className="h-4 w-4" />}
          />
          <AiPlaceholderCard
            title="AI uyga vazifa tekshiruvi"
            description="Uyga vazifalarni avtomatik baholash"
            icon={<Brain className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* ── Academic Calendar ── */}
      <AcademicCalendarWidget canEdit={false} />
    </div>
  );
}
