'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Trash2, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { periodsApi } from '@/lib/api/periods';
import { branchesApi } from '@/lib/api/branches';
import { cn } from '@/lib/utils';

interface StepPeriodsProps {
  onDone: () => void;
}

const DEFAULT_TEMPLATES = [
  {
    name: '5 davr',
    periods: [
      { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
      { periodNumber: 2, startTime: '08:55', endTime: '09:40' },
      { periodNumber: 3, startTime: '09:50', endTime: '10:35' },
      { periodNumber: 4, startTime: '10:45', endTime: '11:30' },
      { periodNumber: 5, startTime: '11:40', endTime: '12:25' },
    ],
  },
  {
    name: '6 davr (standart)',
    periods: [
      { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
      { periodNumber: 2, startTime: '08:55', endTime: '09:40' },
      { periodNumber: 3, startTime: '09:50', endTime: '10:35' },
      { periodNumber: 4, startTime: '10:45', endTime: '11:30' },
      { periodNumber: 5, startTime: '11:40', endTime: '12:25' },
      { periodNumber: 6, startTime: '12:35', endTime: '13:20' },
    ],
  },
  {
    name: '7 davr',
    periods: [
      { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
      { periodNumber: 2, startTime: '08:55', endTime: '09:40' },
      { periodNumber: 3, startTime: '09:50', endTime: '10:35' },
      { periodNumber: 4, startTime: '10:45', endTime: '11:30' },
      { periodNumber: 5, startTime: '11:40', endTime: '12:25' },
      { periodNumber: 6, startTime: '12:35', endTime: '13:20' },
      { periodNumber: 7, startTime: '13:30', endTime: '14:15' },
    ],
  },
  {
    name: '8 davr',
    periods: [
      { periodNumber: 1, startTime: '07:30', endTime: '08:10' },
      { periodNumber: 2, startTime: '08:20', endTime: '09:00' },
      { periodNumber: 3, startTime: '09:10', endTime: '09:50' },
      { periodNumber: 4, startTime: '10:00', endTime: '10:40' },
      { periodNumber: 5, startTime: '10:50', endTime: '11:30' },
      { periodNumber: 6, startTime: '11:40', endTime: '12:20' },
      { periodNumber: 7, startTime: '12:30', endTime: '13:10' },
      { periodNumber: 8, startTime: '13:20', endTime: '14:00' },
    ],
  },
];

export function StepPeriods({ onDone }: StepPeriodsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [localPeriods, setLocalPeriods] = useState<Array<{ periodNumber: number; startTime: string; endTime: string; id?: string }>>([]);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const { data: existingPeriods = [], isLoading } = useQuery({
    queryKey: ['periods', selectedBranchId],
    queryFn: () => periodsApi.getAll(selectedBranchId || undefined),
    enabled: branches.length > 0,
  });

  const branchId = selectedBranchId || branches[0]?.id || '';

  const createMut = useMutation({
    mutationFn: (payload: { periodNumber: number; startTime: string; endTime: string }) =>
      periodsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Xato' }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => periodsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['periods'] }),
  });

  const applyTemplate = async (template: typeof DEFAULT_TEMPLATES[0]) => {
    if (!branchId) {
      toast({ variant: 'destructive', title: 'Avval filial tanlang' });
      return;
    }
    // Delete existing periods first to avoid duplicates
    for (const p of existingPeriods as any[]) {
      try { await removeMut.mutateAsync(p.id); } catch {}
    }
    // Create periods one by one (serial) to avoid race conditions
    let created = 0;
    for (const p of template.periods) {
      try {
        await createMut.mutateAsync({ periodNumber: p.periodNumber, startTime: p.startTime, endTime: p.endTime });
        created++;
      } catch (e: any) {
        toast({ variant: 'destructive', title: `${p.periodNumber}-davr qo'shilmadi`, description: e?.response?.data?.message });
      }
    }
    if (created === template.periods.length) {
      toast({ title: `${created} ta dars davri muvaffaqiyatli qo'shildi` });
    }
  };

  const addCustom = () => {
    if (!branchId) return;
    const nextNum = (existingPeriods.length || localPeriods.length) + 1;
    setLocalPeriods((p) => [...p, { periodNumber: nextNum, startTime: '08:00', endTime: '08:45' }]);
  };

  const saveCustom = async (item: typeof localPeriods[0]) => {
    if (!branchId) return;
    await createMut.mutateAsync({ periodNumber: item.periodNumber, startTime: item.startTime, endTime: item.endTime });
    setLocalPeriods((p) => p.filter((x) => x.periodNumber !== item.periodNumber));
  };

  const allPeriods = [...existingPeriods, ...localPeriods];
  const hasPeriods = allPeriods.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
        Har bir filial uchun dars davrlarini (qo\'ng\'iroq jadvali) sozlang.
      </p>

      {/* Branch selector */}
      {branches.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-xedu-slate-500">Filial:</label>
          <select
            className="h-8 rounded-md border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-950 px-2 text-xs"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Templates — always visible */}
      <div>
        <p className="text-xs font-medium text-xedu-slate-500 mb-2 uppercase tracking-wider">Tezkor shablonlar</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DEFAULT_TEMPLATES.map((t) => (
            <Card
              key={t.name}
              className="border border-xedu-slate-100 dark:border-xedu-slate-800 hover:border-xedu-primary/40 cursor-pointer transition-colors"
              onClick={() => applyTemplate(t)}
            >
              <CardContent className="p-2.5 text-center">
                <p className="text-sm font-bold text-xedu-primary">{t.periods.length}</p>
                <p className="text-[10px] text-xedu-slate-500 mt-0.5">davr</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-[10px] text-xedu-slate-400 mt-1.5">Shablon tanlansa, mavjud davrlar almashtiriladi</p>
      </div>

      {/* Periods list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : existingPeriods.length === 0 && localPeriods.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Dars davrlari sozlanmagan"
          description="Yuqoridagi shablonlardan birini tanlang yoki qo'lda qo'shing."
        />
      ) : (
        <div className="space-y-2">
          {existingPeriods.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 p-2.5"
            >
              <span className="h-6 w-6 rounded-full bg-xedu-primary/10 text-xedu-primary text-xs font-bold flex items-center justify-center">
                {p.periodNumber}
              </span>
              <span className="text-sm flex-1">
                {p.startTime} — {p.endTime}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-xedu-ruby" onClick={() => removeMut.mutate(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {localPeriods.map((p, i) => (
            <div key={`local-${i}`} className="flex items-center gap-2 rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 p-2.5">
              <span className="h-6 w-6 rounded-full bg-xedu-amber/10 text-xedu-amber text-xs font-bold flex items-center justify-center">
                {p.periodNumber}
              </span>
              <Input
                type="time"
                value={p.startTime}
                onChange={(e) => setLocalPeriods((prev) => prev.map((x, idx) => (idx === i ? { ...x, startTime: e.target.value } : x)))}
                className="h-7 text-xs w-24"
              />
              <span className="text-xs text-xedu-slate-400">—</span>
              <Input
                type="time"
                value={p.endTime}
                onChange={(e) => setLocalPeriods((prev) => prev.map((x, idx) => (idx === i ? { ...x, endTime: e.target.value } : x)))}
                className="h-7 text-xs w-24"
              />
              <Button size="sm" className="h-7 text-xs ml-auto" onClick={() => saveCustom(p)} disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Saqlash'}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={addCustom} disabled={!branchId}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Qo'lda davr qo'shish
      </Button>

      {!hasPeriods && (
        <div className="rounded-xl bg-xedu-amber/5 border border-xedu-amber/10 p-3 text-xs text-xedu-amber flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Kamida 1 ta dars davri sozlanishi kerak.</p>
        </div>
      )}

      <Button className="w-full" onClick={onDone} disabled={!hasPeriods}>
        {hasPeriods ? 'Davom etish' : 'Dars davrlarini sozlang'}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
