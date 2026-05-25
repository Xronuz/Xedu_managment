'use client';

import { useMemo } from 'react';
import { DayOfWeek } from '@eduplatform/types';
import { User, School, MonitorPlay } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AvailabilitySlot {
  id: string;
  dayOfWeek: DayOfWeek;
  timeSlot: number;
  startTime: string;
  endTime: string;
  status: string;
  subject?: { name: string };
  class?: { name: string };
  teacher?: { firstName: string; lastName: string };
  room?: { name: string };
}

interface AvailabilityPreviewProps {
  teacherSlots?: AvailabilitySlot[];
  classSlots?: AvailabilitySlot[];
  roomSlots?: AvailabilitySlot[];
  targetDay?: DayOfWeek;
  targetSlot?: number;
  isLoading?: boolean;
}

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: DayOfWeek.MONDAY, label: 'Du' },
  { key: DayOfWeek.TUESDAY, label: 'Se' },
  { key: DayOfWeek.WEDNESDAY, label: 'Ch' },
  { key: DayOfWeek.THURSDAY, label: 'Pa' },
  { key: DayOfWeek.FRIDAY, label: 'Ju' },
  { key: DayOfWeek.SATURDAY, label: 'Sh' },
  { key: DayOfWeek.SUNDAY, label: 'Ya' },
];

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];

function MiniGrid({
  title,
  icon,
  slots,
  targetDay,
  targetSlot,
}: {
  title: string;
  icon: React.ReactNode;
  slots: AvailabilitySlot[];
  targetDay?: DayOfWeek;
  targetSlot?: number;
}) {
  const cellMap = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const s of slots) {
      const key = `${s.dayOfWeek}:${s.timeSlot}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [slots]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-2 py-1.5 bg-xedu-slate-50 dark:bg-xedu-slate-800/60 text-xs font-medium text-xedu-slate-600 dark:text-xedu-slate-300 flex items-center gap-1.5">
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-8 gap-px bg-border">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="bg-background text-[10px] text-center py-0.5 text-xedu-slate-500">
            {label}
          </div>
        ))}
        {SLOTS.map((slotNum) =>
          DAYS.map(({ key: day }) => {
            const key = `${day}:${slotNum}`;
            const cells = cellMap.get(key) ?? [];
            const isTarget = targetDay === day && targetSlot === slotNum;
            const hasConflict = cells.length > 0 && isTarget;

            return (
              <div
                key={key}
                className={`bg-background h-5 relative ${
                  isTarget
                    ? hasConflict
                      ? 'bg-red-100 dark:bg-red-900/30 ring-1 ring-inset ring-red-400'
                      : 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-inset ring-amber-300'
                    : cells.length > 0
                    ? 'bg-xedu-slate-100 dark:bg-xedu-slate-800/40'
                    : ''
                }`}
                title={cells.map((c) => `${c.subject?.name ?? ''} ${c.startTime}-${c.endTime}`).join(', ')}
              >
                {cells.length > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      cells[0].status === 'published' ? 'bg-xedu-primary' : 'bg-yellow-400'
                    }`} />
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AvailabilityPreview({
  teacherSlots,
  classSlots,
  roomSlots,
  targetDay,
  targetSlot,
  isLoading,
}: AvailabilityPreviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  const hasAny = (teacherSlots && teacherSlots.length > 0) || (classSlots && classSlots.length > 0) || (roomSlots && roomSlots.length > 0);
  if (!hasAny) {
    return (
      <p className="text-xs text-xedu-slate-400 text-center py-2">
        Bandlik ma&apos;lumotlari yo&apos;q
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {teacherSlots && teacherSlots.length > 0 && (
        <MiniGrid
          title="O'qituvchi bandligi"
          icon={<User className="h-3 w-3" />}
          slots={teacherSlots}
          targetDay={targetDay}
          targetSlot={targetSlot}
        />
      )}
      {classSlots && classSlots.length > 0 && (
        <MiniGrid
          title="Sinf bandligi"
          icon={<School className="h-3 w-3" />}
          slots={classSlots}
          targetDay={targetDay}
          targetSlot={targetSlot}
        />
      )}
      {roomSlots && roomSlots.length > 0 && (
        <MiniGrid
          title="Xona bandligi"
          icon={<MonitorPlay className="h-3 w-3" />}
          slots={roomSlots}
          targetDay={targetDay}
          targetSlot={targetSlot}
        />
      )}
    </div>
  );
}
