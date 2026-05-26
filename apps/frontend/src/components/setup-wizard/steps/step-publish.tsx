'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Rocket, CheckCircle2, AlertCircle, ArrowRight, Loader2,
  ShieldAlert, Eye, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { scheduleApi } from '@/lib/api/schedule';
import { opsCommandCenterApi } from '@/lib/api/ops-command-center';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface StepPublishProps {
  onDone: () => void;
}

export function StepPublish({ onDone }: StepPublishProps) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canPublish = ['director', 'vice_principal'].includes(user?.role ?? '');

  const [validationDone, setValidationDone] = useState(false);

  const { data: weekData, isLoading } = useQuery({
    queryKey: ['schedule-week-drafts'],
    queryFn: () => scheduleApi.getWeek({ includeDrafts: true, includeArchived: false }),
    staleTime: 10_000,
  });

  const { data: readiness } = useQuery({
    queryKey: ['readiness', user?.schoolId],
    queryFn: () => (user?.schoolId ? opsCommandCenterApi.getReadiness(user.schoolId) : Promise.reject('no school')),
    enabled: !!user?.schoolId,
  });

  // Extract draft slots from week data
  const allSlots = (weekData as any)?.slots ?? (Array.isArray(weekData) ? weekData : []);
  const draftSlots = allSlots.filter((s: any) => s.status === 'draft' || !s.status);
  const draftCount = draftSlots.length;

  // Simple conflict check: same teacher same time
  const conflicts: string[] = [];
  if (draftSlots.length > 0) {
    const byTeacherTime = new Map<string, any[]>();
    for (const slot of draftSlots) {
      const key = `${slot.teacherId}_${slot.dayOfWeek}_${slot.timeSlot}`;
      const arr = byTeacherTime.get(key) ?? [];
      arr.push(slot);
      byTeacherTime.set(key, arr);
    }
    byTeacherTime.forEach((arr) => {
      if (arr.length > 1) {
        conflicts.push(`O'qituvchi ${arr[0].teacher?.firstName ?? ''} ${arr[0].teacher?.lastName ?? ''} ${arr[0].dayOfWeek} kuni ${arr[0].timeSlot}-davrda ${arr.length} ta darsga tayinlangan`);
      }
    });
    // Same room same time
    const byRoomTime = new Map<string, any[]>();
    for (const slot of draftSlots) {
      if (!slot.roomId) continue;
      const key = `${slot.roomId}_${slot.dayOfWeek}_${slot.timeSlot}`;
      const arr = byRoomTime.get(key) ?? [];
      arr.push(slot);
      byRoomTime.set(key, arr);
    }
    byRoomTime.forEach((arr) => {
      if (arr.length > 1) {
        conflicts.push(`Xona ${arr[0].room?.name ?? arr[0].roomId} ${arr[0].dayOfWeek} kuni ${arr[0].timeSlot}-davrda ${arr.length} ta darsga tayinlangan`);
      }
    });
  }

  const publishMut = useMutation({
    mutationFn: async () => {
      const ids = draftSlots.map((s: any) => s.id).filter(Boolean);
      if (ids.length === 0) throw new Error('Nashr qilish uchun loyiha darslari topilmadi');
      return scheduleApi.bulkPublish(ids);
    },
    onSuccess: () => {
      toast({ title: 'Dars jadvali nashr etildi' });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['readiness'] });
      setValidationDone(true);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.message ?? e?.response?.data?.message ?? 'Nashr xatosi' }),
  });

  const handleFinish = () => {
    if (canPublish && draftCount > 0 && conflicts.length === 0) {
      publishMut.mutate();
    } else {
      setValidationDone(true);
      onDone();
    }
  };

  if (validationDone || publishMut.isSuccess) {
    return (
      <div className="text-center space-y-5 py-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-xedu-emerald/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-xedu-emerald" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Sozlash yakunlandi</h3>
          <p className="text-sm text-xedu-slate-500 mt-1">
            Maktabingiz asosiy sozlamalari tayyor. Dars jadvali operatsion rejimga o'tdi.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/schedule')}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Jadvalni ko'rish
          </Button>
          <Button size="sm" onClick={() => router.push('/dashboard/ops')}>
            <Rocket className="mr-1.5 h-3.5 w-3.5" />
            Operatsion markaz
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Bosh sahifaga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
        Loyiha holatidagi darslarni tekshirib, nashr eting. Bu bosqichdan keyin o&apos;qituvchilar va o&apos;quvchilar jadvalni ko&apos;rishadi.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-xedu-sky">{draftCount}</p>
            <p className="text-[10px] text-xedu-slate-500">Loyiha darslar</p>
          </CardContent>
        </Card>
        <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
          <CardContent className="p-3 text-center">
            <p className={cn('text-xl font-bold', conflicts.length > 0 ? 'text-xedu-ruby' : 'text-xedu-emerald')}>
              {conflicts.length}
            </p>
            <p className="text-[10px] text-xedu-slate-500">Ziddiyatlar</p>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="rounded-xl bg-xedu-ruby/5 border border-xedu-ruby/10 p-3 space-y-2">
          <p className="text-xs font-medium text-xedu-ruby flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            Ziddiyatlar topildi
          </p>
          <ul className="space-y-1">
            {conflicts.map((c, i) => (
              <li key={i} className="text-xs text-xedu-slate-600 flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 text-xedu-ruby shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => router.push('/dashboard/schedule')}>
            Jadvalda tuzatish
          </Button>
        </div>
      )}

      {draftCount === 0 && !isLoading && (
        <EmptyState
          icon={Rocket}
          title="Loyiha darslar mavjud emas"
          description="Avval 6-qadamda jadval generatsiya qilib, loyiha sifatida saqlang."
        />
      )}

      {!canPublish && (
        <div className="rounded-xl bg-xedu-sky/5 border border-xedu-sky/10 p-3 text-xs text-xedu-sky flex items-start gap-2">
          <Lock className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Nashr etish huquqi faqat direktor yoki o&apos;rinbosarga tegishli. Siz tekshirishni yakunlashingiz mumkin.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard/schedule')}>
          <Eye className="mr-1.5 h-4 w-4" />
          Jadvalda ko&apos;rish
        </Button>
        <Button
          className="flex-1"
          onClick={handleFinish}
          disabled={publishMut.isPending || draftCount === 0}
        >
          {publishMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Rocket className="mr-1.5 h-4 w-4" />}
          {canPublish ? 'Tekshirish va nashr etish' : 'Tekshirishni yakunlash'}
        </Button>
      </div>
    </div>
  );
}
