'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, X, ChevronRight, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { demoRequestsApi, type DemoRequest, type DemoRequestStatus } from '@/lib/api/super-admin';
import { C } from '../../_components/shared-widgets';

const STATUS_LABELS: Record<DemoRequestStatus, string> = {
  new: 'Yangi',
  contacted: 'Bog\'lashildi',
  scheduled: 'Rejalashtirildi',
  completed: 'Tugallandi',
  rejected: 'Rad etildi',
};

const STATUS_COLORS: Record<DemoRequestStatus, string> = {
  new: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  contacted: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  scheduled: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-red-500/15 text-red-500',
};

export function DemoRequestsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<DemoRequestStatus | 'all'>('all');
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['demo-requests', statusFilter],
    queryFn: () => demoRequestsApi.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 50,
    }),
    refetchInterval: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['demo-requests', 'stats'],
    queryFn: demoRequestsApi.getStats,
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status?: DemoRequestStatus; notes?: string } }) =>
      demoRequestsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demo-requests'] });
      toast({ variant: 'success', title: 'Yangilandi' });
      setSelected(null);
    },
  });

  const requests = data?.data ?? [];
  const s = statsData?.data ?? {} as Record<DemoRequestStatus, number>;
  const newCount = s.new ?? 0;

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: C.bg }}>
            <Rocket className="h-4 w-4" style={{ color: C.primary }} />
          </div>
          <div>
            <p className="font-bold text-[14px] flex items-center gap-2" style={{ color: C.text }}>
              Demo So'rovlar
              {newCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                  {newCount}
                </span>
              )}
            </p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              Jami: {data?.meta?.total ?? 0} so'rov
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'new', 'contacted', 'scheduled', 'completed', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition border ${
                statusFilter === st
                  ? 'border-xedu-primary bg-xedu-primary text-white'
                  : 'border-transparent hover:border-xedu-border'
              }`}
              style={{ color: statusFilter === st ? undefined : C.muted }}
            >
              {st === 'all' ? 'Barchasi' : STATUS_LABELS[st]}
              {st !== 'all' && s[st] ? ` (${s[st]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : requests.length === 0 ? (
        <div className="py-10 text-center">
          <Rocket className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm" style={{ color: C.muted }}>So'rovlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div
              key={r.id}
              onClick={() => { setSelected(r); setNotes(r.notes ?? ''); }}
              className="flex items-center justify-between rounded-xl border p-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              style={{ borderColor: C.border }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-white"
                  style={{ background: C.primary }}>
                  {r.firstName[0]}{r.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] truncate" style={{ color: C.text }}>
                    {r.firstName} {r.lastName}
                  </p>
                  <p className="text-xs truncate" style={{ color: C.muted }}>{r.institution} · {r.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
                <span className="text-[10px]" style={{ color: C.muted }}>
                  {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                </span>
                <ChevronRight className="h-3.5 w-3.5" style={{ color: C.muted }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-[16px]" style={{ color: C.text }}>
                  {selected.firstName} {selected.lastName}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: C.muted }}>{selected.institution}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X className="h-4 w-4" style={{ color: C.muted }} />
              </button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              {[
                ['Email', selected.email],
                ['Telefon', selected.phone],
                ['Sana', new Date(selected.createdAt).toLocaleString('uz-UZ')],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="font-medium w-20 shrink-0" style={{ color: C.muted }}>{label}</span>
                  <span style={{ color: C.text }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-1 block" style={{ color: C.muted }}>Izoh</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Izoh qoldiring..."
                className="text-sm resize-none"
                rows={2}
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-1 block" style={{ color: C.muted }}>Status</label>
              <Select
                value={selected.status}
                onValueChange={(val) =>
                  updateMutation.mutate({ id: selected.id, payload: { status: val as DemoRequestStatus, notes } })
                }
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as DemoRequestStatus[]).map((st) => (
                    <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => updateMutation.mutate({ id: selected.id, payload: { notes } })}
              disabled={updateMutation.isPending}
              className="w-full h-9 rounded-xl text-sm font-semibold text-white transition flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ background: C.primary }}
            >
              {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Saqlash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
