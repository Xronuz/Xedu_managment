'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  CalendarDays, CheckCircle2, XCircle, Clock, AlertCircle,
  Users, CheckCheck, BarChart2, TrendingUp, TrendingDown,
  FileUp, ArrowRight, Eye, MessageSquare, ChevronRight,
  AlertTriangle, School, ClipboardCheck, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, getScoreColor, getInitials } from '@/lib/utils';
import { attendanceApi } from '@/lib/api/attendance';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { AttendanceStatus } from '@eduplatform/types';
import { ImportDialog } from '@/components/import/import-dialog';

import {
  WorkspaceShell,
  WorkspaceHeader,
  WorkspaceToolbar,
  WorkspaceMain,
  WorkspaceSidebar,
  WorkspaceSection,
  StatPill, QuickLink, InfoItem
} from '@/components/workspace-system';
import {
  PrimaryAction,
  SecondaryAction,
  IconAction,
  ActionBar,
} from '@/components/workspace-system/action-bar';
import { EntityPanel } from '@/components/workspace-system/entity-panel';
import { FloatingBulkToolbar } from '@/components/director-workspace/floating-bulk-toolbar';

/* ═══════════════════════════════════════════════════════════════════════════════
   ATTENDANCE WORKSPACE
   Daily operational attendance workspace optimized for teacher workflows.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface ClassInfo {
  id: string;
  name: string;
  gradeLevel?: number;
  academicYear?: string;
  _count?: { students: number };
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string;
  student?: { id: string; firstName: string; lastName: string };
}

interface ClassStudent {
  id: string;
  studentId: string;
  classId: string;
  student?: { id: string; firstName: string; lastName: string };
}

const STATUS_CONFIG = {
  present: { label: 'Keldi', icon: CheckCircle2, color: 'text-xedu-emerald-600', ring: 'ring-xedu-emerald-500 bg-xedu-emerald-50 dark:bg-xedu-emerald-950', dot: 'bg-xedu-emerald-500', border: 'border-xedu-emerald-200', bgSoft: 'bg-xedu-emerald-50/60' },
  absent:  { label: 'Kelmadi', icon: XCircle, color: 'text-xedu-ruby-600', ring: 'ring-xedu-ruby-500 bg-xedu-ruby-50 dark:bg-xedu-ruby-950', dot: 'bg-xedu-ruby-500', border: 'border-xedu-ruby-200', bgSoft: 'bg-xedu-ruby-50/60' },
  late:    { label: 'Kechikdi', icon: Clock, color: 'text-xedu-amber-600', ring: 'ring-xedu-amber-500 bg-xedu-amber-50 dark:bg-xedu-amber-950', dot: 'bg-xedu-amber-500', border: 'border-xedu-amber-200', bgSoft: 'bg-xedu-amber-50/60' },
  excused: { label: 'Uzrli', icon: AlertCircle, color: 'text-xedu-sky-600', ring: 'ring-xedu-sky-500 bg-xedu-sky-50 dark:bg-xedu-sky-950', dot: 'bg-xedu-sky-500', border: 'border-xedu-sky-200', bgSoft: 'bg-xedu-sky-50/60' },
} as const;

type Status = keyof typeof STATUS_CONFIG;

// ── Heat-map cell ──────────────────────────────────────────────────────────────
function HeatCell({ pct }: { pct: number | null }) {
  if (pct === null) return <div className="w-5 h-5 rounded-sm bg-xedu-slate-100 dark:bg-xedu-slate-800/60" title="Ma'lumot yo'q" />;
  const bg =
    pct >= 95 ? 'bg-xedu-emerald-500' :
    pct >= 80 ? 'bg-xedu-emerald-300 dark:bg-xedu-emerald-700' :
    pct >= 60 ? 'bg-xedu-amber-400' :
    pct >= 40 ? 'bg-xedu-amber-500' : 'bg-xedu-ruby-500';
  return (
    <div className={`w-5 h-5 rounded-sm ${bg} opacity-80 hover:opacity-100 transition-opacity cursor-default`} title={`${pct}% keldi`} />
  );
}

export function AttendanceWorkspace() {
  const { toast } = useToast();
  const { user, activeBranchId } = useAuthStore();
  const queryClient = useQueryClient();

  const canMark = ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'].includes(user?.role ?? '');
  const isDirector = user?.role === 'director';
  const isVP = user?.role === 'vice_principal';
  const isBranchAdmin = user?.role === 'branch_admin';
  const canSeeAll = isDirector || isVP || isBranchAdmin;

  const today = format(new Date(), 'yyyy-MM-dd');

  // ── Local state ────────────────────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Status>>({});
  const [view, setView] = useState<'mark' | 'history'>('mark');
  const [importOpen, setImportOpen] = useState(false);
  const [panelStudent, setPanelStudent] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: classes, isError: classesError } = useQuery<ClassInfo[]>({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
  });
  const classList: ClassInfo[] = Array.isArray(classes) ? classes : [];

  const { data: classStudents } = useQuery<ClassStudent[]>({
    queryKey: ['class-students', selectedClass, activeBranchId],
    queryFn: () => classesApi.getStudents(selectedClass),
    enabled: !!selectedClass,
  });
  const students = (Array.isArray(classStudents) ? classStudents : []).map(
    (s) => (s.student ?? s) as { id: string; firstName: string; lastName: string }
  );

  // Today's report
  const { data: reportData, isLoading: reportLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'report', selectedClass, selectedDate, activeBranchId],
    queryFn: () => attendanceApi.getReport({ classId: selectedClass || undefined, startDate: selectedDate, endDate: selectedDate }),
    enabled: !!selectedClass,
  });
  const report: AttendanceRecord[] = Array.isArray(reportData) ? reportData : [];

  // 28-day history for heat-map
  const { data: historyData } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'history28', selectedClass, activeBranchId],
    queryFn: () => attendanceApi.getReport({
      classId: selectedClass || undefined,
      startDate: format(subDays(new Date(), 27), 'yyyy-MM-dd'),
      endDate: today,
    }),
    enabled: !!selectedClass && view === 'history',
  });
  const history: AttendanceRecord[] = Array.isArray(historyData) ? historyData : [];

  // Today summary (for sidebar intelligence)
  const { data: todaySummary } = useQuery({
    queryKey: ['attendance', 'today-summary'],
    queryFn: attendanceApi.getTodaySummary,
    staleTime: 60_000,
  });

  // Student history (for EntityPanel)
  const { data: studentHistory } = useQuery({
    queryKey: ['attendance', 'student-history', panelStudent?.id],
    queryFn: () => panelStudent ? attendanceApi.getStudentHistory(panelStudent.id, 30) : [],
    enabled: !!panelStudent,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onMutate: async (payload) => {
      const reportKey = ['attendance', 'report', selectedClass, selectedDate];
      await queryClient.cancelQueries({ queryKey: reportKey });
      const snapshot = queryClient.getQueryData<AttendanceRecord[]>(reportKey);

      const entryMap = new Map(payload.entries.map((e: any) => [e.studentId, e.status]));

      queryClient.setQueryData<AttendanceRecord[]>(reportKey, (old = []) => {
        const updated: AttendanceRecord[] = old.map(r =>
          entryMap.has(r.studentId) ? { ...r, status: entryMap.get(r.studentId) as AttendanceRecord['status'] } : r
        );
        entryMap.forEach((status, studentId) => {
          if (!old.some(r => r.studentId === studentId)) {
            updated.push({ id: `opt-${studentId}`, studentId, classId: selectedClass, date: selectedDate, status: status as AttendanceRecord['status'] });
          }
        });
        return updated;
      });

      return { snapshot, reportKey };
    },
    onSuccess: () => {
      toast({ title: 'Davomat saqlandi' });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setAttendanceMap({});
      setSelectedIds([]);
    },
    onError: (err: any, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(context.reportKey, context.snapshot);
      }
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  // ── Computed stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    report.forEach(r => { if (r.status in counts) counts[r.status as Status]++; });
    return counts;
  }, [report]);

  const totalMarked = stats.present + stats.absent + stats.late + stats.excused;
  const unmarkedCount = students.length - totalMarked;

  // ── Heat-map data ───────────────────────────────────────────────────────────
  const heatMapData = useMemo(() => {
    if (!students.length || !history.length) return [];
    const lookup = new Map<string, Map<string, AttendanceRecord[]>>();
    for (const r of history) {
      const dateKey = format(new Date(r.date), 'yyyy-MM-dd');
      if (!lookup.has(r.studentId)) lookup.set(r.studentId, new Map());
      const dateMap = lookup.get(r.studentId)!;
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(r);
    }
    const last28 = Array.from({ length: 28 }, (_, i) => format(subDays(new Date(), 27 - i), 'yyyy-MM-dd'));
    return students.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      days: last28.map(date => {
        const recs = lookup.get(s.id)?.get(date);
        if (!recs?.length) return null;
        const presentCount = recs.filter(r => r.status === 'present').length;
        return Math.round((presentCount / recs.length) * 100);
      }),
    }));
  }, [students, history]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    setAttendanceMap({});
    setSelectedIds([]);
  };

  const markAllPresent = () => {
    const map: Record<string, Status> = {};
    students.forEach(s => { map[s.id] = 'present'; });
    setAttendanceMap(map);
    toast({ title: `${students.length} ta o'quvchi "Keldi" deb belgilandi` });
  };

  const markAllAbsent = () => {
    const map: Record<string, Status> = {};
    students.forEach(s => { map[s.id] = 'absent'; });
    setAttendanceMap(map);
    toast({ title: `${students.length} ta o'quvchi "Kelmadi" deb belgilandi` });
  };

  const setStatus = (studentId: string, status: Status) => {
    setAttendanceMap(p => ({ ...p, [studentId]: status }));
  };

  const handleSubmit = () => {
    if (!selectedClass) return;
    const entries = students.map(s => ({
      studentId: s.id,
      status: (attendanceMap[s.id] ?? 'present') as AttendanceStatus,
    }));
    markMutation.mutate({ classId: selectedClass, date: selectedDate, entries });
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === students.length && students.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  }, [selectedIds.length, students]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Bulk mark handlers ──────────────────────────────────────────────────────
  const bulkMark = (status: Status) => {
    if (selectedIds.length === 0) return;
    setAttendanceMap(p => {
      const next = { ...p };
      selectedIds.forEach(id => { next[id] = status; });
      return next;
    });
    toast({ title: `${selectedIds.length} ta o'quvchi "${STATUS_CONFIG[status].label}" deb belgilandi` });
  };

  // ── Absence streak detection ────────────────────────────────────────────────
  const absenceStreaks = useMemo(() => {
    if (!students.length || !history.length) return [];
    const streaks: { studentId: string; name: string; streak: number }[] = [];
    students.forEach(s => {
      const recs = history.filter(h => h.studentId === s.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      let streak = 0;
      for (const r of recs) {
        if (r.status === 'absent') streak++;
        else break;
      }
      if (streak >= 2) streaks.push({ studentId: s.id, name: `${s.firstName} ${s.lastName}`, streak });
    });
    return streaks.sort((a, b) => b.streak - a.streak).slice(0, 5);
  }, [students, history]);

  // ── Summary data ────────────────────────────────────────────────────────────
  const summary = todaySummary as any;

  if (classesError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-10 w-10 text-xedu-ruby-400" />
        <p className="text-lg font-semibold text-xedu-slate-700">Ma'lumot yuklanmadi</p>
        <p className="text-sm text-xedu-slate-500">Server bilan bog'lanishda xato yuz berdi.</p>
      </div>
    );
  }

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="Davomat"
          subtitle="Kunlik davomat belgilash va tahlil"
          icon={<ClipboardCheck className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            <ActionBar
              primary={
                <div className="inline-flex items-center gap-1 rounded-lg p-0.5 bg-xedu-slate-100 dark:bg-xedu-slate-800">
                  {(['mark', 'history'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={cn(
                        'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition-all',
                        view === v
                          ? 'bg-white dark:bg-xedu-slate-700 text-xedu-slate-800 dark:text-xedu-slate-100 shadow-sm'
                          : 'text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-700'
                      )}
                    >
                      {v === 'mark' ? 'Belgilash' : 'Tarix'}
                    </button>
                  ))}
                </div>
              }
              secondary={
                canMark && (
                  <>
                    <SecondaryAction icon={<FileUp className="h-3.5 w-3.5" />} onClick={() => setImportOpen(true)}>
                      Import
                    </SecondaryAction>
                    <SecondaryAction onClick={() => { window.location.href = '/dashboard/attendance/bulk'; }}>
                      Guruh
                    </SecondaryAction>
                  </>
                )
              }
            />
          }
        />
      </div>

      {/* Control bar */}
      <div className="w-full lg:col-span-2">
        <WorkspaceToolbar sticky>
          {/* Class pills */}
          <div className="flex flex-wrap gap-1.5 flex-1">
            {classList.map((cls: any) => {
              const active = selectedClass === cls.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => handleClassSelect(cls.id)}
                  className={cn(
                    'whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-all',
                    active
                      ? 'bg-xedu-primary text-white shadow-sm'
                      : 'bg-white dark:bg-xedu-slate-800 border border-xedu-slate-200 dark:border-xedu-slate-700 text-xedu-slate-600 hover:bg-xedu-slate-50'
                  )}
                >
                  {cls.name}
                </button>
              );
            })}
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <Label className="text-2xs text-xedu-slate-400 shrink-0">Sana:</Label>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => { setSelectedDate(e.target.value); setAttendanceMap({}); }}
              className="h-7 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700 outline-none focus:ring-1 focus:ring-xedu-primary"
            />
          </div>
        </WorkspaceToolbar>
      </div>

      {/* Main content */}
      <WorkspaceMain>
        {!selectedClass ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <CalendarDays className="h-8 w-8 text-xedu-slate-300" />
            <p className="text-sm font-medium text-xedu-slate-500">Sinf tanlang</p>
            <p className="text-xs text-xedu-slate-400">Davomat belgilash uchun yuqoridan sinfni tanlang</p>
          </div>
        ) : view === 'mark' ? (
          <div className="space-y-3">
            {/* Marking controls */}
            {canMark && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
                    {students.length} ta o'quvchi
                  </p>
                  <p className="text-xs text-xedu-slate-400">
                    {selectedDate === today ? 'Bugun' : selectedDate}
                    {unmarkedCount > 0 && (
                      <span className="ml-2 text-xedu-amber-600 font-semibold">{unmarkedCount} ta belgilanmagan</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <SecondaryAction icon={<CheckCheck className="h-3.5 w-3.5" />} onClick={markAllPresent}>
                    Hammasi keldi
                  </SecondaryAction>
                  <SecondaryAction icon={<XCircle className="h-3.5 w-3.5" />} onClick={markAllAbsent}>
                    Hammasi kelmadi
                  </SecondaryAction>
                  <PrimaryAction loading={markMutation.isPending} onClick={handleSubmit} disabled={students.length === 0}>
                    Saqlash
                  </PrimaryAction>
                </div>
              </div>
            )}

            {/* Student roster */}
            {reportLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Users className="h-8 w-8 text-xedu-slate-300" />
                <p className="text-sm font-medium text-xedu-slate-500">Bu sinfda o'quvchilar yo'q</p>
              </div>
            ) : (
              <div className="space-y-1">
                {students.map((s: any, idx: number) => {
                  const current: Status = attendanceMap[s.id] ?? 'present';
                  const cfg = STATUS_CONFIG[current];
                  const isSelected = selectedIds.includes(s.id);
                  const hasReport = report.some(r => r.studentId === s.id);

                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 transition-all border',
                        isSelected ? 'border-xedu-primary bg-xedu-primary-light/30' : 'border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900/50',
                        current !== 'present' && !isSelected && cfg.bgSoft
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelect(s.id)}
                          className={cn(
                            'h-11 w-11 sm:h-4 sm:w-4 rounded border transition-colors shrink-0 flex items-center justify-center',
                            isSelected ? 'bg-xedu-primary border-xedu-primary' : 'border-xedu-slate-300 hover:border-xedu-primary'
                          )}
                        >
                          {isSelected && <CheckCheck className="h-5 w-5 sm:h-3 sm:w-3 text-white" />}
                        </button>

                        <span className="w-5 text-2xs font-mono text-xedu-slate-400 text-right shrink-0">{idx + 1}</span>
                        <div className={cn('h-2 w-2 rounded-full shrink-0', cfg.dot)} />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-xedu-slate-900 dark:text-xedu-slate-100 truncate block">
                            {s.firstName} {s.lastName}
                          </span>
                          {current !== 'present' && (
                            <span className={cn('text-2xs font-bold', cfg.color)}>{cfg.label}</span>
                          )}
                          {hasReport && !attendanceMap[s.id] && (
                            <span className="text-2xs text-xedu-slate-400 ml-1">· Avval belgilangan</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Status toggles */}
                        {canMark && (Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([status, c]) => {
                          const Icon = c.icon;
                          const isActive = current === status;
                          return (
                            <button
                              key={status}
                              className={cn(
                                'h-11 w-11 sm:h-7 sm:w-7 flex items-center justify-center rounded-md transition-colors',
                                isActive
                                  ? 'bg-xedu-slate-800 text-white dark:bg-white dark:text-xedu-slate-900'
                                  : cn('hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800', c.color)
                              )}
                              onClick={() => setStatus(s.id, status)}
                              title={c.label}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}

                        {/* Actions */}
                        <IconAction
                          icon={<Eye className="h-3.5 w-3.5" />}
                          title="Ko'rish"
                          onClick={() => setPanelStudent(s)}
                          tone="primary"
                        />
                        <IconAction
                          icon={<MessageSquare className="h-3.5 w-3.5" />}
                          title="Xabar"
                          onClick={() => { window.location.href = `/dashboard/messages?userId=${s.id}`; }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Today's report summary */}
            {report.length > 0 && (
              <div className="mt-4 pt-3 border-t border-xedu-slate-100 dark:border-xedu-slate-800">
                <p className="text-xs font-bold text-xedu-slate-700 mb-2">
                  {selectedDate === today ? 'Bugungi' : selectedDate} hisobot
                </p>
                <div className="space-y-1">
                  {report.map((r: any) => {
                    const cfg = STATUS_CONFIG[r.status as Status] ?? STATUS_CONFIG.present;
                    return (
                      <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0 border-xedu-slate-50 dark:border-xedu-slate-800">
                        <span className="font-medium text-xedu-slate-700">{r.student?.firstName} {r.student?.lastName}</span>
                        <div className="flex items-center gap-2">
                          {r.note && <span className="text-2xs italic text-xedu-slate-400">&ldquo;{r.note}&rdquo;</span>}
                          <span className={cn('flex items-center gap-1 text-2xs font-bold', cfg.color)}>
                            <cfg.icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── HISTORY VIEW ───────────────────────────────────────────────────── */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-xedu-primary" />
              <p className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">So'nggi 28 kun davomati</p>
            </div>
            <p className="text-xs text-xedu-slate-400">Yashil = yuqori davomat · Qizil = past davomat</p>
            {heatMapData.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <TrendingUp className="h-8 w-8 text-xedu-slate-300" />
                <p className="text-sm text-xedu-slate-500">Ma'lumot yo'q yoki yuklanmoqda...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-1 pr-2 font-semibold w-32 text-xedu-slate-500">O'quvchi</th>
                      {Array.from({ length: 28 }, (_, i) => {
                        const d = subDays(new Date(), 27 - i);
                        return (
                          <th key={i} className="px-0.5 text-center font-normal text-xedu-slate-400" title={format(d, 'dd.MM')}>
                            {i % 7 === 0 || i === 27 ? format(d, 'dd') : ''}
                          </th>
                        );
                      })}
                      <th className="text-right pl-2 font-semibold text-xedu-slate-500">O'rt.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatMapData.map(({ id, name, days }) => {
                      const valid = days.filter(d => d !== null) as number[];
                      const avg = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
                      return (
                        <tr key={id} className="border-t border-xedu-slate-100 dark:border-xedu-slate-800">
                          <td className="py-1 pr-2 font-semibold truncate max-w-[128px] text-xedu-slate-700">
                            <button onClick={() => setPanelStudent({ id, firstName: name.split(' ')[0], lastName: name.split(' ')[1] ?? '' })} className="hover:text-xedu-primary transition-colors text-left">
                              {name}
                            </button>
                          </td>
                          {days.map((d, i) => (
                            <td key={i} className="px-0.5 py-1">
                              <HeatCell pct={d} />
                            </td>
                          ))}
                          <td className="pl-2 text-right font-bold" style={{ color: avg !== null ? getScoreColor(avg) : undefined }}>
                            {avg !== null ? `${avg}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-xedu-slate-100 text-2xs text-xedu-slate-400 flex-wrap">
                  <span>Davomat:</span>
                  {[['bg-xedu-ruby-500', '< 40%'], ['bg-xedu-amber-500', '40–59%'], ['bg-xedu-amber-400', '60–79%'], ['bg-xedu-emerald-300', '80–94%'], ['bg-xedu-emerald-500', '95–100%']].map(([c, l]) => (
                    <span key={l} className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-sm ${c} inline-block`} />
                      {l}
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-xedu-slate-200 inline-block" /> Ma'lumot yo'q
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </WorkspaceMain>

      {/* Right sidebar: Attendance intelligence */}
      <WorkspaceSidebar width="narrow">
        {/* Today's summary */}
        {summary && (
          <WorkspaceSection title="Bugun" icon={<ClipboardCheck className="h-4 w-4" />}>
            <div className="grid grid-cols-2 gap-2">
              <StatPill label="Keldi" value={summary.present} tone="success" />
              <StatPill label="Kelmadi" value={summary.absent} tone={summary.absent > 0 ? 'urgent' : 'calm'} />
              <StatPill label="Kechikdi" value={summary.late} tone="attention" />
              <StatPill label="Uzrli" value={summary.excused} tone="calm" />
            </div>
            <div className="mt-2 flex items-center justify-between text-2xs text-xedu-slate-400">
              <span>Belgilanish: {summary.marked}/{summary.totalStudents}</span>
              <span className="font-bold text-xedu-slate-700">{summary.presentPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-xedu-slate-100 overflow-hidden mt-1">
              <div className="h-full rounded-full bg-xedu-primary transition-all" style={{ width: `${summary.presentPct}%` }} />
            </div>
          </WorkspaceSection>
        )}

        {/* Class stats for selected class */}
        {selectedClass && totalMarked > 0 && (
          <WorkspaceSection title="Sinf statistikasi" icon={<School className="h-4 w-4" />}>
            <div className="grid grid-cols-2 gap-2">
              <StatPill label="Keldi" value={stats.present} tone="success" />
              <StatPill label="Kelmadi" value={stats.absent} tone={stats.absent > 0 ? 'urgent' : 'calm'} />
              <StatPill label="Kechikdi" value={stats.late} tone="attention" />
              <StatPill label="Uzrli" value={stats.excused} tone="calm" />
            </div>
            {unmarkedCount > 0 && (
              <div className="flex items-start gap-2 mt-2 px-1">
                <AlertTriangle className="h-3.5 w-3.5 text-xedu-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-xedu-amber-700">{unmarkedCount} ta o'quvchi belgilanmagan</p>
              </div>
            )}
          </WorkspaceSection>
        )}

        {/* Absence streak alerts */}
        {absenceStreaks.length > 0 && view === 'history' && (
          <WorkspaceSection title="Diqqat talab" icon={<AlertTriangle className="h-4 w-4 text-xedu-ruby-500" />}>
            <div className="space-y-1">
              {absenceStreaks.map((s) => (
                <button
                  key={s.studentId}
                  onClick={() => setPanelStudent({ id: s.studentId, firstName: s.name.split(' ')[0], lastName: s.name.split(' ')[1] ?? '' })}
                  className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <span className="text-xs font-medium text-xedu-slate-700 truncate">{s.name}</span>
                  <span className="text-2xs font-bold text-xedu-ruby-600 shrink-0">{s.streak} kun kelmagan</span>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/attendance/bulk" icon={Users} label="Guruh davomati" />
            <QuickLink href="/dashboard/students" icon={Users} label="O'quvchilar" />
            <QuickLink href="/dashboard/classes" icon={School} label="Sinflar" />
            <QuickLink href="/dashboard/reports" icon={BarChart3} label="Hisobotlar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Student Entity Panel */}
      <StudentAttendancePanel
        student={panelStudent}
        history={studentHistory as any[]}
        open={!!panelStudent}
        onClose={() => setPanelStudent(null)}
      />

      {/* Bulk toolbar */}
      <FloatingBulkToolbar
        visible={selectedIds.length >= 1 && canMark}
        selectedIds={selectedIds}
        actions={[
          {
            id: 'present',
            label: 'Keldi',
            icon: CheckCircle2,
            tone: 'primary',
            onClick: () => bulkMark('present'),
          },
          {
            id: 'absent',
            label: 'Kelmadi',
            icon: XCircle,
            tone: 'danger',
            onClick: () => bulkMark('absent'),
          },
          {
            id: 'late',
            label: 'Kechikdi',
            icon: Clock,
            tone: 'neutral',
            onClick: () => bulkMark('late'),
          },
          {
            id: 'excused',
            label: 'Uzrli',
            icon: AlertCircle,
            tone: 'neutral',
            onClick: () => bulkMark('excused'),
          },
        ]}
        onClear={clearSelection}
      />

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="attendance"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['attendance'] })}
      />
    </WorkspaceShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────



// ── Student Attendance Entity Panel ────────────────────────────────────────────

function StudentAttendancePanel({
  student,
  history,
  open,
  onClose,
}: {
  student: { id: string; firstName: string; lastName: string } | null;
  history: any[];
  open: boolean;
  onClose: () => void;
}) {
  if (!student) return null;

  const recs = Array.isArray(history) ? history : (history as any)?.data ?? [];
  const presentCount = recs.filter((r: any) => r.status === 'present').length;
  const absentCount = recs.filter((r: any) => r.status === 'absent').length;
  const lateCount = recs.filter((r: any) => r.status === 'late').length;
  const total = recs.length;
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : null;

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-xedu-primary-light flex items-center justify-center text-lg font-bold text-xedu-primary">
              {getInitials(student.firstName, student.lastName)}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{student.firstName} {student.lastName}</p>
              <p className="text-xs text-xedu-slate-500">O'quvchi</p>
            </div>
          </div>

          {total > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <StatPill label="Jami" value={total} />
              <StatPill label="Keldi" value={presentCount} tone="success" />
              <StatPill label="Kelmadi" value={absentCount} tone={absentCount > 0 ? 'urgent' : 'calm'} />
              <StatPill label="Kechikdi" value={lateCount} tone="attention" />
            </div>
          )}

          {rate !== null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400">Davomat foizi</span>
                <span className={cn('text-sm font-bold', getScoreColor(rate))}>{rate}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-xedu-slate-100 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', rate >= 80 ? 'bg-xedu-primary' : rate >= 60 ? 'bg-xedu-amber-400' : 'bg-xedu-ruby-500')} style={{ width: `${rate}%` }} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <SecondaryAction icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/messages?userId=${student.id}`; }}>
              Xabar
            </SecondaryAction>
            <SecondaryAction icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/users/${student.id}`; }}>
              Profil
            </SecondaryAction>
          </div>
        </div>
      ),
    },
    {
      id: 'history',
      label: 'Tarix',
      content: (
        <div className="p-5">
          {recs.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <BarChart2 className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Davomat tarixi mavjud emas</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {recs.slice(0, 30).map((r: any) => {
                const cfg = STATUS_CONFIG[r.status as Status] ?? STATUS_CONFIG.present;
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-md border border-xedu-slate-100 px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                      <span className="text-xs font-medium text-xedu-slate-700">{cfg.label}</span>
                    </div>
                    <span className="text-2xs text-xedu-slate-400">{r.date ? format(new Date(r.date), 'dd.MM.yyyy') : '—'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'activity',
      label: 'Faoliyat',
      content: (
        <div className="p-5">
          <div className="flex flex-col items-center py-8 gap-2">
            <Clock className="h-6 w-6 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Faoliyat jurnali mavjud emas</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <EntityPanel
      open={open}
      onClose={onClose}
      entityType="student"
      title={`${student.firstName} ${student.lastName}`}
      subtitle="Davomat ma'lumotlari"
      status={rate !== null && rate >= 80 ? 'active' : rate !== null && rate >= 60 ? 'pending' : 'inactive'}
      metrics={[
        { label: 'Jami', value: total, tone: 'calm' },
        { label: 'Keldi', value: presentCount, tone: 'success' },
        { label: 'Kelmadi', value: absentCount, tone: absentCount > 0 ? 'urgent' : 'calm' },
      ]}
      tabs={tabs}
    />
  );
}
