'use client';

import { useMemo } from 'react';
import {
  DndContext, useDraggable, useDroppable, DragOverlay,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { DayOfWeek } from '@eduplatform/types';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { cn, jsDayToTimetableDay } from '@/lib/utils';
import type { ScheduleSlot } from './schedule-workspace';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: DayOfWeek.MONDAY,    label: 'Dushanba',   short: 'Du' },
  { key: DayOfWeek.TUESDAY,   label: 'Seshanba',   short: 'Se' },
  { key: DayOfWeek.WEDNESDAY, label: 'Chorshanba', short: 'Ch' },
  { key: DayOfWeek.THURSDAY,  label: 'Payshanba',  short: 'Pa' },
  { key: DayOfWeek.FRIDAY,    label: 'Juma',       short: 'Ju' },
  { key: DayOfWeek.SATURDAY,  label: 'Shanba',     short: 'Sh' },
  { key: DayOfWeek.SUNDAY,    label: 'Yakshanba',  short: 'Ya' },
];

const SUBJECT_COLORS = [
  'bg-xedu-sky-100 text-xedu-sky-800 border-xedu-sky-200 dark:bg-xedu-sky-900/30 dark:text-xedu-sky-300 dark:border-xedu-sky-800',
  'bg-xedu-emerald-100 text-xedu-emerald-800 border-xedu-emerald-200 dark:bg-xedu-emerald-900/30 dark:text-xedu-emerald-300 dark:border-xedu-emerald-800',
  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  'bg-xedu-amber-100 text-xedu-amber-800 border-xedu-amber-200 dark:bg-xedu-amber-900/30 dark:text-xedu-amber-300 dark:border-xedu-amber-800',
  'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  'bg-xedu-indigo-100 text-xedu-indigo-800 border-xedu-indigo-200 dark:bg-xedu-indigo-900/30 dark:text-xedu-indigo-300 dark:border-xedu-indigo-800',
  'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
];

const SLOT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '08:50', end: '09:35' },
  3: { start: '09:40', end: '10:25' },
  4: { start: '10:30', end: '11:15' },
  5: { start: '11:20', end: '12:05' },
  6: { start: '12:10', end: '12:55' },
  7: { start: '13:00', end: '13:45' },
  8: { start: '13:50', end: '14:35' },
};

interface WeeklyGridProps {
  schedule: ScheduleSlot[];
  canManage: boolean;
  onDelete: (id: string) => void;
  onAdd: (day: DayOfWeek, slot: number) => void;
  onSelect: (slot: ScheduleSlot) => void;
  onMove?: (id: string, dayOfWeek: DayOfWeek, timeSlot: number) => void;
  activeSlotId?: string | null;
}

function DraggableSlot({
  cell,
  colorCls,
  hasConflict,
  canManage,
  onDelete,
  onSelect,
}: {
  cell: ScheduleSlot;
  colorCls: string;
  hasConflict: boolean;
  canManage: boolean;
  onDelete: (id: string) => void;
  onSelect: (slot: ScheduleSlot) => void;
}) {
  const isCross = cell.isCrossBranch === true;
  const isPublished = cell.status === 'published';
  const draggable = canManage && !isCross && !isPublished;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cell.id,
    data: { cell },
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      onClick={() => !isCross && onSelect(cell)}
      title={isCross ? `Boshqa filial: ${cell.branch?.name ?? ''}` : undefined}
      className={cn(
        'relative rounded-lg border p-2 text-xs group transition-shadow cursor-pointer',
        isCross ? 'cursor-not-allowed' : 'hover:shadow-sm',
        colorCls,
        hasConflict && !isCross ? 'ring-1 ring-xedu-ruby-400 dark:ring-xedu-ruby-600' : '',
        isDragging && 'opacity-40'
      )}
    >
      {isCross && (
        <span className="absolute top-0.5 right-0.5 rounded text-[8px] px-1 bg-muted-foreground/20 text-xedu-slate-500 dark:text-xedu-slate-400">
          {cell.branch?.code ?? 'boshqa'}
        </span>
      )}
      {canManage && cell.status && cell.status !== 'published' && (
        <span className={cn(
          'absolute top-0.5 rounded text-[8px] px-1',
          isCross ? 'right-8' : 'right-0.5',
          cell.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
          cell.status === 'validated' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-500'
        )}>
          {cell.status === 'draft' ? 'Q' : cell.status === 'validated' ? 'T' : 'A'}
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
}

function DroppableCell({
  day,
  slot,
  canManage,
  onAdd,
  isToday,
  children,
}: {
  day: DayOfWeek;
  slot: number;
  canManage: boolean;
  onAdd: (day: DayOfWeek, slot: number) => void;
  isToday: boolean;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${day}-${slot}`,
    data: { day, slot },
    disabled: !canManage,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => canManage && !children && onAdd(day, slot)}
      className={cn(
        'min-h-[72px] rounded-lg border-2 border-dashed flex items-center justify-center transition-colors group',
        isToday ? 'border-primary/20 bg-primary/5' : 'border-muted hover:border-primary/30 hover:bg-xedu-slate-50/80 dark:hover:bg-xedu-slate-700/30',
        canManage ? 'cursor-pointer' : 'cursor-default',
        isOver && canManage && 'border-primary bg-primary/10'
      )}
    >
      {children ?? (
        canManage && (
          <Plus className="h-3 w-3 text-xedu-slate-500 dark:text-xedu-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )
      )}
    </div>
  );
}

export function WeeklyGrid({
  schedule,
  canManage,
  onDelete,
  onAdd,
  onSelect,
  onMove,
}: WeeklyGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

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

  const todayKey = jsDayToTimetableDay(new Date().getDay());

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !onMove) return;
    const data = over.data.current as { day: DayOfWeek; slot: number } | undefined;
    if (!data) return;
    const cell = active.data.current?.cell as ScheduleSlot | undefined;
    if (!cell) return;
    if (cell.dayOfWeek === data.day && cell.timeSlot === data.slot) return;
    onMove(cell.id, data.day, data.slot);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-1 mb-1">
            <div className="flex items-center justify-center text-xs font-medium text-xedu-slate-500 dark:text-xedu-slate-400 py-2">
              Soat
            </div>
            {DAYS.map(({ key, label, short }) => (
              <div
                key={key}
                className={cn(
                  'text-center py-2 rounded-lg text-sm font-semibold',
                  key === todayKey
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-xedu-slate-50 dark:bg-xedu-slate-800/60 text-xedu-slate-500 dark:text-xedu-slate-400'
                )}
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
                    <DroppableCell
                      key={day}
                      day={day}
                      slot={slot}
                      canManage={canManage}
                      onAdd={onAdd}
                      isToday={isToday}
                    />
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
                    <DroppableCell
                      day={day}
                      slot={slot}
                      canManage={canManage}
                      onAdd={onAdd}
                      isToday={isToday}
                    >
                      {cells.map((cell) => {
                        const cIdx = subjectColorMap.get(cell.subjectId) ?? 0;
                        return (
                          <DraggableSlot
                            key={cell.id}
                            cell={cell}
                            colorCls={SUBJECT_COLORS[cIdx]}
                            hasConflict={hasConflict}
                            canManage={canManage}
                            onDelete={onDelete}
                            onSelect={onSelect}
                          />
                        );
                      })}
                    </DroppableCell>
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
                  <div key={subjectId} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs', SUBJECT_COLORS[idx])}>
                    <span className="font-medium">{s.subject?.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DndContext>
  );
}
