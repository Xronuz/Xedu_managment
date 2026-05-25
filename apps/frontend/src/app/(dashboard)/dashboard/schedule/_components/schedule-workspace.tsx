'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/store/confirm.store';
import { scheduleApi } from '@/lib/api/schedule';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { usersApi } from '@/lib/api/users';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { DayOfWeek } from '@eduplatform/types';

import {
  Calendar, Clock, Plus, Loader2, Trash2, LayoutGrid, List,
  AlertTriangle, Upload, Search, X, Filter, Eye, Edit3, ArrowRight,
  School, Users, BookOpen, BarChart3, TrendingUp, MonitorPlay,
  CheckCircle, MessageSquare, BarChart2, Trophy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { ImportDialog } from '@/components/import/import-dialog';

import {
  WorkspaceShell, WorkspaceHeader, WorkspaceToolbar, WorkspaceMain, WorkspaceSidebar, WorkspaceSection,
  StatPill, QuickLink, InfoItem
} from '@/components/workspace-system';
import {
  PrimaryAction, SecondaryAction, IconAction, ActionBar,
} from '@/components/workspace-system/action-bar';
import { EntityPanel, EntityPanelProps } from '@/components/workspace-system/entity-panel';

/* ═══════════════════════════════════════════════════════════════════════════════
   SCHEDULE WORKSPACE
   Institutional academic orchestration workspace.
   Time-aware, class-aware, teacher-aware, conflict-aware.
   ═══════════════════════════════════════════════════════════════════════════════ */

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: DayOfWeek.MONDAY,    label: 'Dushanba',   short: 'Du' },
  { key: DayOfWeek.TUESDAY,   label: 'Seshanba',   short: 'Se' },
  { key: DayOfWeek.WEDNESDAY, label: 'Chorshanba', short: 'Ch' },
  { key: DayOfWeek.THURSDAY,  label: 'Payshanba',  short: 'Pa' },
  { key: DayOfWeek.FRIDAY,    label: 'Juma',       short: 'Ju' },
  { key: DayOfWeek.SATURDAY,  label: 'Shanba',     short: 'Sh' },
];

const SLOT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '09:00', end: '09:45' },
  3: { start: '10:00', end: '10:45' },
  4: { start: '11:00', end: '11:45' },
  5: { start: '12:00', end: '12:45' },
  6: { start: '13:00', end: '13:45' },
  7: { start: '14:00', end: '14:45' },
};

const SUBJECT_COLORS = [
  'bg-xedu-sky-100 border-xedu-sky-300 text-xedu-sky-800 dark:bg-xedu-sky-900/40 dark:border-xedu-sky-700 dark:text-xedu-sky-200',
  'bg-xedu-emerald-100 border-xedu-emerald-300 text-xedu-emerald-800 dark:bg-xedu-emerald-900/40 dark:border-xedu-emerald-700 dark:text-xedu-emerald-200',
  'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-200',
  'bg-xedu-amber-100 border-xedu-amber-300 text-xedu-amber-800 dark:bg-xedu-amber-900/40 dark:border-xedu-amber-700 dark:text-xedu-amber-200',
  'bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/40 dark:border-pink-700 dark:text-pink-200',
  'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/40 dark:border-teal-700 dark:text-teal-200',
  'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-200',
  'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-200',
  'bg-xedu-amber-100 border-xedu-amber-300 text-xedu-amber-800 dark:bg-xedu-amber-900/40 dark:border-xedu-amber-700 dark:text-xedu-amber-200',
  'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-200',
];

interface ScheduleSlot {
  id: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
  dayOfWeek: DayOfWeek;
  timeSlot: number;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  roomId?: string;
  branchId?: string;
  isCrossBranch?: boolean;
  class?: { id: string; name: string; branchId?: string };
  branch?: { id: string; name: string; code?: string };
  subject?: { id: string; name: string; teacher?: { id: string; firstName: string; lastName: string } };
  room?: { id: string; name: string };
}

interface ConflictResult {
  hasConflict: boolean;
  conflicts: { type: string; message: string }[];
}

const EMPTY = {
  classId: '', subjectId: '', teacherId: '', dayOfWeek: '' as DayOfWeek | '',
  timeSlot: '', startTime: '08:00', endTime: '08:45', roomNumber: '',
};

// ── Lesson Entity Panel ───────────────────────────────────────────────────────

function LessonPanel({ slot, open, onClose, canManage, onEdit, onDelete }: {
  slot: ScheduleSlot | null;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
  onEdit?: (s: ScheduleSlot) => void;
  onDelete?: (id: string) => void;
}) {
  const router = useRouter();
  if (!slot) return null;

  const dayLabel = DAYS.find(d => d.key === slot.dayOfWeek)?.label ?? slot.dayOfWeek;

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-xedu-primary" />
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{slot.subject?.name ?? '—'}</p>
              <p className="text-xs text-xedu-slate-500">{dayLabel} · {slot.startTime}–{slot.endTime}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={School} label="Sinf" value={slot.class?.name ?? '—'} />
            <InfoItem icon={Users} label="O'qituvchi" value={slot.subject?.teacher ? `${slot.subject.teacher.firstName} ${slot.subject.teacher.lastName}` : '—'} />
            <InfoItem icon={Clock} label="Vaqt" value={`${slot.startTime} – ${slot.endTime}`} />
            <InfoItem icon={MonitorPlay} label="Xona" value={slot.room?.name ?? slot.roomNumber ?? '—'} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {canManage && onEdit && (
              <PrimaryAction icon={<Edit3 className="h-3.5 w-3.5" />} onClick={() => onEdit(slot)}>
                Tahrirlash
              </PrimaryAction>
            )}
            <SecondaryAction icon={<CheckCircle className="h-3.5 w-3.5" />} onClick={() => router.push('/dashboard/attendance')}>
              Davomat
            </SecondaryAction>
            <SecondaryAction icon={<School className="h-3.5 w-3.5" />} onClick={() => slot.classId && router.push(`/dashboard/classes/${slot.classId}`)}>
              Sinf
            </SecondaryAction>
            {slot.subject?.teacher?.id && (
              <SecondaryAction icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/messages?userId=${slot.subject?.teacher?.id}`; }}>
                Xabar
              </SecondaryAction>
            )}
            {canManage && onDelete && (
              <SecondaryAction
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => onDelete(slot.id)}
              >
                O'chirish
              </SecondaryAction>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <EntityPanel
      open={open}
      onClose={onClose}
      entityType="default"
      title={slot.subject?.name ?? 'Dars'}
      subtitle={`${dayLabel} · ${slot.startTime}–${slot.endTime}`}
      status="active"
      metrics={[
        { label: 'Sinf', value: slot.class?.name ?? '—', tone: 'calm' },
        { label: 'Slot', value: String(slot.timeSlot), tone: 'calm' },
        { label: 'Xona', value: slot.room?.name ?? slot.roomNumber ?? '—', tone: 'calm' },
      ]}
      tabs={tabs}
    />
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────




// ── Weekly Grid ───────────────────────────────────────────────────────────────

function WeeklyGrid({
  schedule, canManage, onDelete, onAdd, onSelect,
}: {
  schedule: ScheduleSlot[];
  canManage: boolean;
  onDelete: (id: string) => void;
  onAdd: (day: DayOfWeek, slot: number) => void;
  onSelect: (slot: ScheduleSlot) => void;
}) {
  const subjectColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const s of schedule) {
      if (s.subjectId && !map.has(s.subjectId)) {
        map.set(s.subjectId, idx++ % SUBJECT_COLORS.length);
      }
    }
    return map;
  }, [schedule]);

  const getSlot = (day: DayOfWeek, slot: number) =>
    schedule.filter((s) => s.dayOfWeek === day && s.timeSlot === slot);

  const todayKey = DAYS[new Date().getDay() === 0 ? 5 : new Date().getDay() - 1]?.key;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 gap-1 mb-1">
          <div className="flex items-center justify-center text-xs font-medium text-xedu-slate-500 dark:text-xedu-slate-400 py-2">
            Soat
          </div>
          {DAYS.map(({ key, label, short }) => (
            <div
              key={key}
              className={`text-center py-2 rounded-lg text-sm font-semibold ${
                key === todayKey ? 'bg-primary text-primary-foreground' : 'bg-xedu-slate-50 dark:bg-xedu-slate-800/60 text-xedu-slate-500 dark:text-xedu-slate-400'
              }`}
            >
              <span className="hidden sm:block">{label}</span>
              <span className="sm:hidden">{short}</span>
            </div>
          ))}
        </div>

        {[1, 2, 3, 4, 5, 6, 7].map((slot) => (
          <div key={slot} className="grid grid-cols-7 gap-1 mb-1">
            <div className="flex flex-col items-center justify-center py-2 px-1">
              <span className="text-xs font-bold text-xedu-slate-500 dark:text-xedu-slate-400">{slot}</span>
              <span className="text-2xs text-xedu-slate-500 dark:text-xedu-slate-400">{SLOT_TIMES[slot].start}</span>
            </div>

            {DAYS.map(({ key: day }) => {
              const cells = getSlot(day, slot);
              const isToday = day === todayKey;

              if (cells.length === 0) {
                return (
                  <div
                    key={day}
                    onClick={() => canManage && onAdd(day, slot)}
                    className={`min-h-[72px] rounded-lg border-2 border-dashed flex items-center justify-center transition-colors group
                      ${isToday ? 'border-primary/20 bg-primary/5' : 'border-muted hover:border-primary/30 hover:bg-xedu-slate-50/80 dark:hover:bg-xedu-slate-700/30'}
                      ${canManage ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    {canManage && (
                      <Plus className="h-3 w-3 text-xedu-slate-500 dark:text-xedu-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                );
              }

              const hasConflict = cells.length > 1;
              const teacherIds = cells.map((c) => c.teacherId).filter(Boolean);
              const roomNums = cells.map((c) => c.roomNumber).filter(Boolean);
              const teacherConflict = new Set(teacherIds).size < teacherIds.length;
              const roomConflict = new Set(roomNums).size < roomNums.length;

              return (
                <div key={day} className="space-y-1">
                  {hasConflict && (
                    <div className="flex items-center gap-1 rounded px-1 py-0.5 bg-xedu-ruby-100 dark:bg-xedu-ruby-900/30 border border-xedu-ruby-300 dark:border-xedu-ruby-700">
                      <AlertTriangle className="h-2.5 w-2.5 text-xedu-ruby-500 shrink-0" />
                      <span className="text-2xs text-xedu-ruby-600 dark:text-xedu-ruby-400 font-medium leading-tight">
                        {teacherConflict ? "O'qituvchi ziddiyati" : roomConflict ? 'Xona ziddiyati' : 'Ziddiyat'}
                      </span>
                    </div>
                  )}
                  {cells.map((cell) => {
                    const cIdx = subjectColorMap.get(cell.subjectId) ?? 0;
                    const isCross = cell.isCrossBranch === true;
                    const colorCls = isCross
                      ? 'bg-muted/40 border-muted-foreground/20 text-xedu-slate-500 dark:text-xedu-slate-400 opacity-60'
                      : SUBJECT_COLORS[cIdx];

                    return (
                      <div
                        key={cell.id}
                        onClick={() => !isCross && onSelect(cell)}
                        title={isCross ? `Boshqa filial: ${cell.branch?.name ?? ''}` : undefined}
                        className={`relative rounded-lg border p-2 text-xs group transition-shadow cursor-pointer
                          ${isCross ? 'cursor-not-allowed' : 'hover:shadow-sm'}
                          ${colorCls}
                          ${hasConflict && !isCross ? 'ring-1 ring-xedu-ruby-400 dark:ring-xedu-ruby-600' : ''}`}
                      >
                        {isCross && (
                          <span className="absolute top-0.5 right-0.5 rounded text-[8px] px-1 bg-muted-foreground/20 text-xedu-slate-500 dark:text-xedu-slate-400">
                            {cell.branch?.code ?? 'boshqa'}
                          </span>
                        )}
                        <p className="font-semibold truncate pr-5">{cell.subject?.name}</p>
                        <p className="opacity-70 truncate">{cell.class?.name}</p>
                        {(cell.roomNumber || cell.room?.name) && (
                          <p className="opacity-60 text-2xs">Xona: {cell.room?.name ?? cell.roomNumber}</p>
                        )}
                        {canManage && !isCross && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(cell.id); }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-black/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}

        {subjectColorMap.size > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
            {Array.from(subjectColorMap.entries()).map(([subjectId, idx]) => {
              const s = schedule.find((x) => x.subjectId === subjectId);
              if (!s) return null;
              return (
                <div key={subjectId} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${SUBJECT_COLORS[idx]}`}>
                  <span className="font-medium">{s.subject?.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({
  schedule, activeDay, onDayChange, canManage, onDelete, onSelect,
}: {
  schedule: ScheduleSlot[];
  activeDay: DayOfWeek;
  onDayChange: (d: DayOfWeek) => void;
  canManage: boolean;
  onDelete: (id: string) => void;
  onSelect: (slot: ScheduleSlot) => void;
}) {
  const LIST_COLORS = [
    'bg-xedu-sky-100 dark:bg-xedu-sky-900/40',
    'bg-xedu-emerald-100 dark:bg-xedu-emerald-900/40',
    'bg-purple-100 dark:bg-purple-900/40',
    'bg-xedu-amber-100 dark:bg-xedu-amber-900/40',
    'bg-pink-100 dark:bg-pink-900/40',
  ];

  const slots = schedule
    .filter((s) => s.dayOfWeek === activeDay)
    .sort((a, b) => a.timeSlot - b.timeSlot);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {DAYS.map(({ key, label }) => {
          const count = schedule.filter((s) => s.dayOfWeek === key).length;
          const active = activeDay === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayChange(key)}
              className={cn(
                'relative inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-xedu-bg-elevated text-xedu-slate-600 hover:bg-xedu-slate-50 dark:bg-xedu-slate-900 dark:text-xedu-slate-300 dark:hover:bg-xedu-slate-800 shadow-sm'
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  'ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-2xs font-bold',
                  active ? 'bg-white/20 text-white' : 'bg-xedu-slate-200 text-xedu-slate-600 dark:bg-xedu-slate-700 dark:text-xedu-slate-300'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-xedu-slate-500 dark:text-xedu-slate-400">
            <Calendar className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>Bu kun uchun darslar yo'q</p>
            {canManage && <p className="text-sm mt-1">Yuqoridagi "Dars qo'shish" tugmasini bosing</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {slots.map((slot, idx) => {
            const isCross = slot.isCrossBranch === true;
            return (
              <div
                key={slot.id}
                onClick={() => !isCross && onSelect(slot)}
                className={cn(
                  'flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-colors',
                  isCross ? 'opacity-60 bg-muted/40' : LIST_COLORS[idx % LIST_COLORS.length]
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-black/20 font-bold text-lg">
                  {slot.timeSlot}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{slot.subject?.name}</p>
                    {isCross && (
                      <Badge variant="outline" className="text-2xs h-4 px-1 border-muted-foreground/40 text-xedu-slate-500 dark:text-xedu-slate-400">
                        {slot.branch?.name ?? 'boshqa filial'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
                    {slot.class?.name}
                    {slot.subject?.teacher && <> · {slot.subject.teacher.firstName} {slot.subject.teacher.lastName}</>}
                  </p>
                </div>
                <div className="text-right text-sm flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-1 text-xedu-slate-500 dark:text-xedu-slate-400">
                      <Clock className="h-3 w-3" />
                      {slot.startTime} – {slot.endTime}
                    </div>
                    {(slot.roomNumber || slot.room?.name) && (
                      <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                        Xona: {slot.room?.name ?? slot.roomNumber}
                      </p>
                    )}
                  </div>
                  {canManage && !isCross && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-ruby" onClick={(e) => { e.stopPropagation(); onDelete(slot.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Student Schedule View ─────────────────────────────────────────────────────

export function StudentScheduleView() {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { activeBranchId } = useAuthStore();

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
    select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []),
  });

  const classId = selectedClassId || (classes as any[])[0]?.id || '';

  const { data: weekData, isLoading: schedLoading } = useQuery({
    queryKey: ['schedule', 'week', classId, activeBranchId],
    queryFn: () => scheduleApi.getWeek(classId),
    enabled: !!classId,
    select: (data: any) => (Array.isArray(data) ? data : []),
  });

  const schedule: ScheduleSlot[] = (weekData ?? []) as ScheduleSlot[];

  const subjectColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const s of schedule) {
      const sid = s.subjectId ?? s.subject?.id;
      if (sid && !map.has(sid)) {
        map.set(sid, idx++ % SUBJECT_COLORS.length);
      }
    }
    return map;
  }, [schedule]);

  const todayKey = (() => {
    const i = new Date().getDay();
    return DAYS[i === 0 ? 5 : i - 1]?.key ?? DayOfWeek.MONDAY;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dars jadvali</h1>
          <p className="text-xedu-slate-500 dark:text-xedu-slate-400 flex items-center gap-2">
            Haftalik dars jadvali
            <span className="inline-flex items-center gap-1 text-xs text-xedu-slate-500 dark:text-xedu-slate-400 bg-muted border border-xedu-slate-200 dark:border-xedu-slate-700 rounded-full px-2 py-0.5">
              <Eye className="h-3 w-3" />
              Faqat ko&apos;rish
            </span>
          </p>
        </div>
        {(classes as any[]).length > 1 && (
          <Select value={classId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Sinf tanlang..." /></SelectTrigger>
            <SelectContent>
              {(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {classesLoading || schedLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : schedule.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-xedu-slate-500 dark:text-xedu-slate-400">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Bu sinf uchun dars jadvali tuzilmagan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {DAYS.map(({ key: day, label }) => {
            const daySlots = [...schedule.filter(s => s.dayOfWeek === day)]
              .sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0));
            if (daySlots.length === 0) return null;
            const isToday = day === todayKey;
            return (
              <Card key={day} className={isToday ? 'border-primary shadow-sm' : ''}>
                <div className="py-3 px-4 flex flex-row items-center gap-2 border-b">
                  <span className="text-sm font-semibold">{label}</span>
                  {isToday && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Bugun</Badge>}
                  <Badge variant="secondary" className="text-xs ml-auto">{daySlots.length} dars</Badge>
                </div>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {daySlots.map((slot) => {
                      const sid = slot.subjectId ?? slot.subject?.id ?? '';
                      const colorClass = SUBJECT_COLORS[subjectColorMap.get(sid) ?? 0];
                      const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
                      const [sh, sm] = (slot.startTime ?? SLOT_TIMES[slot.timeSlot]?.start ?? '0:0').split(':').map(Number);
                      const [eh, em] = (slot.endTime ?? SLOT_TIMES[slot.timeSlot]?.end ?? '0:0').split(':').map(Number);
                      const isNow = isToday && nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
                      return (
                        <div key={slot.id} className={cn('flex items-center gap-4 px-4 py-3 transition-colors', isNow ? 'bg-primary/5' : 'hover:bg-xedu-slate-50/80 dark:hover:bg-xedu-slate-700/30')}>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-xedu-slate-500 dark:text-xedu-slate-400">
                            {slot.timeSlot}
                          </div>
                          <div className={cn('flex-1 rounded-lg border px-3 py-2 text-sm', colorClass)}>
                            <p className="font-semibold leading-tight">{slot.subject?.name ?? '—'}</p>
                            <p className="text-xs opacity-70 mt-0.5">
                              {slot.subject?.teacher
                                ? `${slot.subject.teacher.firstName} ${slot.subject.teacher.lastName}`
                                : ''}
                              {slot.roomNumber && ` · ${slot.roomNumber}-xona`}
                            </p>
                          </div>
                          <span className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 font-mono shrink-0">
                            {slot.startTime ?? SLOT_TIMES[slot.timeSlot]?.start ?? ''}–
                            {slot.endTime ?? SLOT_TIMES[slot.timeSlot]?.end ?? ''}
                          </span>
                          {isNow && <Badge className="shrink-0 text-xs bg-primary text-primary-foreground">Hozir</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Workspace ────────────────────────────────────────────────────────────

export function ScheduleWorkspace() {
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ask = useConfirm();
  const router = useRouter();

  const canManage = ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '');

  // ── View state ───────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    const i = new Date().getDay();
    return DAYS[i === 0 ? 5 : i - 1]?.key ?? DayOfWeek.MONDAY;
  });

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterClass, setFilterClass] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: weekSchedule, isLoading } = useQuery<ScheduleSlot[]>({
    queryKey: ['schedule', 'week', activeBranchId],
    queryFn: () => scheduleApi.getWeek(),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 1, activeBranchId],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  const classes: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const teachers: any[] = (usersData?.data ?? []).filter((u: any) => ['teacher', 'class_teacher'].includes(u.role));

  const schedule: ScheduleSlot[] = (weekSchedule ?? []) as ScheduleSlot[];

  // ── Filtered schedule ────────────────────────────────────────────────────────
  const filteredSchedule = useMemo(() => {
    return schedule.filter((s) => {
      if (filterClass && s.classId !== filterClass) return false;
      if (filterTeacher && s.teacherId !== filterTeacher) return false;
      if (viewMode === 'list' && s.dayOfWeek !== activeDay) return false;
      return true;
    });
  }, [schedule, filterClass, filterTeacher, viewMode, activeDay]);

  // ── Panel state ──────────────────────────────────────────────────────────────
  const [panelSlot, setPanelSlot] = useState<ScheduleSlot | null>(null);

  // ── Create / Edit modal ──────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditingSlot(null);
    setForm(EMPTY);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setForm({
      classId: slot.classId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId ?? '',
      dayOfWeek: slot.dayOfWeek,
      timeSlot: String(slot.timeSlot),
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomNumber: slot.roomNumber ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const openForDaySlot = (day: DayOfWeek, slot: number) => {
    const times = SLOT_TIMES[slot];
    setEditingSlot(null);
    setForm({ ...EMPTY, dayOfWeek: day, timeSlot: String(slot), startTime: times.start, endTime: times.end });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSlot(null);
    setForm(EMPTY);
    setErrors({});
  };

  const sel = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.classId) e.classId = 'Sinf tanlang';
    if (!form.subjectId) e.subjectId = 'Fan tanlang';
    if (!form.teacherId) e.teacherId = "O'qituvchi tanlang";
    if (!form.dayOfWeek) e.dayOfWeek = 'Kun tanlang';
    if (!form.timeSlot) e.timeSlot = 'Dars raqami tanlang';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Conflict check
  const canCheck = modalOpen && !!form.dayOfWeek && !!form.timeSlot;
  const { data: conflictData } = useQuery<ConflictResult>({
    queryKey: ['schedule-conflict', form.dayOfWeek, form.timeSlot, form.teacherId, form.roomNumber, form.classId, editingSlot?.id],
    queryFn: () => scheduleApi.checkConflict({
      dayOfWeek: form.dayOfWeek as string,
      timeSlot: Number(form.timeSlot),
      teacherId: form.teacherId || undefined,
      roomNumber: form.roomNumber || undefined,
      classId: form.classId || undefined,
      excludeId: editingSlot?.id,
    }),
    enabled: canCheck,
    staleTime: 0,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', activeBranchId],
    queryFn: () => subjectsApi.getAll(),
    enabled: modalOpen,
  });

  const createMutation = useMutation({
    mutationFn: scheduleApi.create,
    onSuccess: () => {
      toast({ title: "Dars jadvali qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      closeModal();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof scheduleApi.update>[1] }) =>
      scheduleApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Dars yangilandi" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      closeModal();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = {
      classId: form.classId,
      subjectId: form.subjectId,
      teacherId: form.teacherId,
      dayOfWeek: form.dayOfWeek as DayOfWeek,
      timeSlot: Number(form.timeSlot),
      startTime: form.startTime,
      endTime: form.endTime,
      roomNumber: form.roomNumber || undefined,
    };
    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: scheduleApi.remove,
    onSuccess: () => {
      toast({ title: "Dars o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });

  const handleDelete = async (id: string) => {
    if (await ask({ title: "Jadval qatorini o'chirishni tasdiqlang", description: "Bu jadval qatori o'chiriladi.", variant: 'destructive', confirmText: "O'chirish" })) {
      deleteMutation.mutate(id);
    }
  };

  // ── Active filter chips ──────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterClass) {
      const c = classes.find((x: any) => x.id === filterClass);
      chips.push({ key: 'class', label: c?.name ?? 'Sinf', onClear: () => setFilterClass('') });
    }
    if (filterTeacher) {
      const t = teachers.find((x: any) => x.id === filterTeacher);
      chips.push({ key: 'teacher', label: t ? `${t.firstName} ${t.lastName}` : "O'qituvchi", onClear: () => setFilterTeacher('') });
    }
    return chips;
  }, [filterClass, filterTeacher, classes, teachers]);

  // ── Intelligence ─────────────────────────────────────────────────────────────
  const todayKey = DAYS[new Date().getDay() === 0 ? 5 : new Date().getDay() - 1]?.key;
  const totalSlots = schedule.length;
  const crossBranchCount = schedule.filter((s) => s.isCrossBranch).length;
  const todaySlots = schedule.filter((s) => s.dayOfWeek === todayKey).length;

  const conflictCount = useMemo(() => {
    let count = 0;
    DAYS.forEach(({ key: day }) => {
      [1, 2, 3, 4, 5, 6, 7].forEach(slot => {
        const cells = schedule.filter(s => s.dayOfWeek === day && s.timeSlot === slot);
        if (cells.length > 1) count++;
      });
    });
    return count;
  }, [schedule]);

  const teacherLoad = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    schedule.forEach((s) => {
      const name = s.subject?.teacher ? `${s.subject.teacher.firstName} ${s.subject.teacher.lastName}` : (s.teacherId ? 'Nomaʼlum' : 'Biriktirilmagan');
      const key = s.teacherId || 'none';
      const cur = map.get(key) ?? { name, count: 0 };
      cur.count++;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [schedule]);

  const classLoad = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    schedule.forEach((s) => {
      const cur = map.get(s.classId) ?? { name: s.class?.name ?? 'Nomaʼlum', count: 0 };
      cur.count++;
      map.set(s.classId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [schedule]);

  const upcomingToday = useMemo(() => {
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    return schedule.filter((s) => {
      if (s.dayOfWeek !== todayKey) return false;
      const [sh, sm] = s.startTime.split(':').map(Number);
      return sh * 60 + sm > nowMins;
    }).sort((a, b) => a.timeSlot - b.timeSlot);
  }, [schedule, todayKey]);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="Dars jadvali"
          subtitle={`${totalSlots - crossBranchCount} ta slot${crossBranchCount > 0 ? ` (+${crossBranchCount} boshqa filial)` : ''} · Akademik boshqaruv`}
          icon={<Calendar className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            canManage && (
              <ActionBar
                primary={
                  <PrimaryAction onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                    Dars qo&apos;shish
                  </PrimaryAction>
                }
                secondary={
                  <SecondaryAction onClick={() => setImportOpen(true)} icon={<Upload className="h-3.5 w-3.5" />}>
                    Excel import
                  </SecondaryAction>
                }
              />
            )
          }
        />
      </div>

      {/* Alerts */}
      {crossBranchCount > 0 && (
        <div className="w-full lg:col-span-2">
          <div className="flex items-center gap-3 rounded-lg border border-muted bg-xedu-slate-50 dark:bg-xedu-slate-800/60 px-4 py-2.5">
            <div className="h-3 w-3 rounded-sm bg-muted-foreground/30 border border-muted-foreground/30 shrink-0" />
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
              <span className="font-medium">{crossBranchCount} ta dars</span> boshqa filiallardan ko&apos;rsatilmoqda
            </p>
          </div>
        </div>
      )}
      {conflictCount > 0 && (
        <div className="w-full lg:col-span-2">
          <div className="flex items-center gap-3 rounded-lg border border-xedu-amber-300 bg-xedu-amber-50 dark:bg-xedu-amber-950/30 dark:border-xedu-amber-700 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-xedu-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-xedu-amber-700 dark:text-xedu-amber-400">{conflictCount} ta ziddiyat aniqlandi</p>
              <p className="text-xs text-xedu-amber-600 dark:text-xedu-amber-500">Bir xil vaqtda bir nechta dars belgilangan.</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="w-full lg:col-span-2">
        <WorkspaceToolbar sticky>
          <div className="flex items-center rounded-lg border p-1 gap-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors',
              showFilters || activeFilters.length > 0
                ? 'border-xedu-primary bg-xedu-primary-light text-xedu-primary'
                : 'border-xedu-slate-200 dark:border-xedu-slate-700 text-xedu-slate-600 hover:bg-xedu-slate-50'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filterlar
            {activeFilters.length > 0 && (
              <span className="ml-0.5 text-2xs font-bold px-1 py-0 rounded-full bg-xedu-primary text-white">
                {activeFilters.length}
              </span>
            )}
          </button>

          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-xedu-primary bg-xedu-primary-light text-xs font-semibold text-xedu-primary"
            >
              {f.label}
              <button onClick={f.onClear} className="hover:text-xedu-ruby-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {activeFilters.length > 0 && (
            <button
              onClick={() => { setFilterClass(''); setFilterTeacher(''); }}
              className="text-xs font-semibold text-xedu-slate-400 hover:text-xedu-ruby-500 transition-colors"
            >
              Tozalash
            </button>
          )}

          <button
            onClick={() => {
              const i = new Date().getDay();
              setActiveDay(DAYS[i === 0 ? 5 : i - 1]?.key ?? DayOfWeek.MONDAY);
              if (viewMode === 'grid') setViewMode('list');
            }}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 text-xs font-semibold text-xedu-slate-600 hover:bg-xedu-slate-50 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Bugun
          </button>
        </WorkspaceToolbar>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pb-2">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha sinflar</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha o'qituvchilar</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main: Timetable surface */}
      <WorkspaceMain>
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="space-y-2">
              {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          )
        ) : (
          <Card>
            <CardContent className={viewMode === 'grid' ? 'pt-4' : 'pt-4 space-y-4'}>
              {viewMode === 'grid' ? (
                <WeeklyGrid
                  schedule={filteredSchedule}
                  canManage={canManage}
                  onDelete={handleDelete}
                  onAdd={openForDaySlot}
                  onSelect={(s) => setPanelSlot(s)}
                />
              ) : (
                <ListView
                  schedule={filteredSchedule}
                  activeDay={activeDay}
                  onDayChange={setActiveDay}
                  canManage={canManage}
                  onDelete={handleDelete}
                  onSelect={(s) => setPanelSlot(s)}
                />
              )}
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>

      {/* Right sidebar: Scheduling intelligence */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Bugun" icon={<Calendar className="h-4 w-4 text-xedu-primary" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami slot" value={totalSlots} />
            <StatPill label="Bugun" value={todaySlots} tone={todaySlots > 0 ? 'success' : 'calm'} />
            <StatPill label="Sinflar" value={new Set(schedule.map(s => s.classId)).size} />
            <StatPill label="Ziddiyat" value={conflictCount} tone={conflictCount > 0 ? 'urgent' : 'calm'} />
          </div>
        </WorkspaceSection>

        {upcomingToday.length > 0 && (
          <WorkspaceSection title="Keyingi darslar" icon={<Clock className="h-4 w-4 text-xedu-primary" />}>
            <div className="space-y-1">
              {upcomingToday.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPanelSlot(s)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-xedu-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">{s.subject?.name}</p>
                    <p className="text-2xs text-xedu-slate-400">{s.class?.name} · {s.startTime}</p>
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {teacherLoad.length > 0 && (
          <WorkspaceSection title="O'qituvchi yuklamasi" icon={<Users className="h-4 w-4" />}>
            <div className="space-y-1">
              {teacherLoad.map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium text-xedu-slate-600 truncate">{t.name}</span>
                  <span className="text-2xs font-bold tabular-nums text-xedu-slate-700">{t.count}</span>
                </div>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {classLoad.length > 0 && (
          <WorkspaceSection title="Sinf yuklamasi" icon={<School className="h-4 w-4" />}>
            <div className="space-y-1">
              {classLoad.map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium text-xedu-slate-600 truncate">{c.name}</span>
                  <span className="text-2xs font-bold tabular-nums text-xedu-slate-700">{c.count}</span>
                </div>
              ))}
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/attendance" icon={CheckCircle} label="Davomat" />
            <QuickLink href="/dashboard/classes" icon={School} label="Sinflar" />
            <QuickLink href="/dashboard/staff" icon={Users} label="Xodimlar" />
            <QuickLink href="/dashboard/exams" icon={Trophy} label="Imtihonlar" />
            <QuickLink href="/dashboard/subjects" icon={BookOpen} label="Fanlar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Lesson Entity Panel */}
      <LessonPanel
        slot={panelSlot}
        open={!!panelSlot}
        onClose={() => setPanelSlot(null)}
        canManage={canManage}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeModal(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlot ? 'Darsni tahrirlash' : "Dars qo'shish"}</DialogTitle>
            <DialogDescription>Haftalik jadvalga dars kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf <span className="text-xedu-ruby">*</span></Label>
                <Select value={form.classId} onValueChange={sel('classId')}>
                  <SelectTrigger><SelectValue placeholder="Sinf..." /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.classId && <p className="text-xs text-xedu-ruby">{errors.classId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fan <span className="text-xedu-ruby">*</span></Label>
                <Select value={form.subjectId} onValueChange={sel('subjectId')}>
                  <SelectTrigger><SelectValue placeholder="Fan..." /></SelectTrigger>
                  <SelectContent>{(subjects as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.subjectId && <p className="text-xs text-xedu-ruby">{errors.subjectId}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>O'qituvchi <span className="text-xedu-ruby">*</span></Label>
              <Select value={form.teacherId} onValueChange={sel('teacherId')}>
                <SelectTrigger><SelectValue placeholder="O'qituvchi..." /></SelectTrigger>
                <SelectContent>{teachers.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent>
              </Select>
              {errors.teacherId && <p className="text-xs text-xedu-ruby">{errors.teacherId}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kun <span className="text-xedu-ruby">*</span></Label>
                <Select value={form.dayOfWeek} onValueChange={sel('dayOfWeek')}>
                  <SelectTrigger><SelectValue placeholder="Kun..." /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
                {errors.dayOfWeek && <p className="text-xs text-xedu-ruby">{errors.dayOfWeek}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Dars raqami <span className="text-xedu-ruby">*</span></Label>
                <Select value={form.timeSlot} onValueChange={(v) => {
                  const times = SLOT_TIMES[Number(v)];
                  setForm(f => ({ ...f, timeSlot: v, startTime: times?.start ?? f.startTime, endTime: times?.end ?? f.endTime }));
                  setErrors(e => { const n = { ...e }; delete n.timeSlot; return n; });
                }}>
                  <SelectTrigger><SelectValue placeholder="1-7..." /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6,7].map(n => <SelectItem key={n} value={String(n)}>{n}-dars ({SLOT_TIMES[n]?.start})</SelectItem>)}</SelectContent>
                </Select>
                {errors.timeSlot && <p className="text-xs text-xedu-ruby">{errors.timeSlot}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Boshlanish</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tugash</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Xona</Label>
                <Input placeholder="101" value={form.roomNumber} onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))} />
              </div>
            </div>
          </div>
          {conflictData?.hasConflict && (
            <div className="rounded-lg border border-xedu-amber-300 bg-xedu-amber-50 dark:bg-xedu-amber-950/30 dark:border-xedu-amber-700 px-3 py-2 space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-xedu-amber-700 dark:text-xedu-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Ziddiyat aniqlandi
              </div>
              {conflictData.conflicts.map((c, i) => (
                <p key={i} className="text-xs text-xedu-amber-600 dark:text-xedu-amber-500 pl-5">{c.message}</p>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>Bekor qilish</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              variant={conflictData?.hasConflict ? 'destructive' : 'default'}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {conflictData?.hasConflict ? 'Baribir saqlash' : (editingSlot ? 'Saqlash' : "Qo'shish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="schedule"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['schedule'] })}
      />
    </WorkspaceShell>
  );
}
