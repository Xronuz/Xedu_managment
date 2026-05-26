'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DoorOpen, Plus, Trash2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { roomsApi } from '@/lib/api/rooms';
import { branchesApi } from '@/lib/api/branches';
import { cn } from '@/lib/utils';

interface StepRoomsProps {
  onDone: () => void;
}

const QUICK_ROOMS = [
  { name: '101', capacity: 30, type: 'classroom' },
  { name: '102', capacity: 30, type: 'classroom' },
  { name: '103', capacity: 30, type: 'classroom' },
  { name: 'Sport zali', capacity: 50, type: 'gym' },
  { name: 'Laboratoriya', capacity: 20, type: 'laboratory' },
];

export function StepRooms({ onDone }: StepRoomsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customCapacity, setCustomCapacity] = useState('30');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const { data: existingRooms = [], isLoading } = useQuery({
    queryKey: ['rooms', selectedBranchId],
    queryFn: () => roomsApi.getAll(selectedBranchId || undefined),
    enabled: branches.length > 0,
  });

  const branchId = selectedBranchId || branches[0]?.id || '';

  const createMut = useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      toast({ title: 'Xona qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setCustomName('');
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Xato' }),
  });

  const removeMut = useMutation({
    mutationFn: roomsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });

  const addQuickRooms = async () => {
    if (!branchId) {
      toast({ variant: 'destructive', title: 'Avval filial tanlang' });
      return;
    }
    const promises = QUICK_ROOMS.map((r) =>
      createMut.mutateAsync({ ...r, branchId })
    );
    await Promise.all(promises);
    toast({ title: `${QUICK_ROOMS.length} ta xona qo'shildi` });
  };

  const hasRooms = existingRooms.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
        Dars olib boriladigan xonalarni qo'shing. Kamida 1 ta xona kerak.
      </p>

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

      {/* Quick add */}
      {existingRooms.length === 0 && (
        <Button variant="outline" className="w-full" onClick={addQuickRooms} disabled={!branchId || createMut.isPending}>
          {createMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Tezkor qo'shish: 101, 102, 103, Sport zali, Laboratoriya
        </Button>
      )}

      {/* Custom add */}
      <div className="flex gap-2">
        <Input
          placeholder="Xona nomi"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="O'rindiq"
          type="number"
          value={customCapacity}
          onChange={(e) => setCustomCapacity(e.target.value)}
          className="w-24"
        />
        <Button onClick={() => createMut.mutate({ name: customName, capacity: Number(customCapacity) || 30, branchId })} disabled={!customName.trim() || !branchId || createMut.isPending}>
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : existingRooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Xonalar qo'shilmagan"
          description="Yuqoridagi tezkor qo'shish tugmasini bosing yoki qo'lda kiriting."
        />
      ) : (
        <div className="space-y-2">
          {existingRooms.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 p-2.5"
            >
              <DoorOpen className="h-4 w-4 text-xedu-primary shrink-0" />
              <span className="text-sm font-medium flex-1">{r.name}</span>
              <span className="text-xs text-xedu-slate-500">{r.capacity} o'rindiq</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-xedu-ruby" onClick={() => removeMut.mutate(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!hasRooms && (
        <div className="rounded-xl bg-xedu-amber/5 border border-xedu-amber/10 p-3 text-xs text-xedu-amber flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Kamida 1 ta xona qo&apos;shilishi kerak.</p>
        </div>
      )}

      <Button className="w-full" onClick={onDone} disabled={!hasRooms}>
        {hasRooms ? 'Davom etish' : 'Xona qo\'shing'}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
