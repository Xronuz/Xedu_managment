'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, Square, Clock, FileText, ShieldAlert,
  CheckCircle2, XCircle, AlertTriangle, User, Building2,
  Calendar, Loader2, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi, type DisciplineIncident } from '@/lib/api/discipline';
import {
  SplitView, SplitViewListHeader, SplitViewListBody,
} from '@/components/director-workspace/split-view';
import { FloatingBulkToolbar } from '@/components/director-workspace/floating-bulk-toolbar';
import { AuditDetailPane } from '@/components/director-workspace/audit-detail-pane';

/* ═══════════════════════════════════════════════════════════════════════════════
   APPROVAL INBOX — Unified approval workflow for Director
   ═══════════════════════════════════════════════════════════════════════════════ */

type ApprovalType = 'leave' | 'discipline';

interface ApprovalItem {
  id: string;
  type: ApprovalType;
  status: string;
  requesterName: string;
  requesterRole?: string;
  branchName?: string;
  reason: string;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  severity?: string;
  raw: any;
}

export default function ApprovalInboxPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'leave' | 'discipline'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('pending');

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ['leave-requests', 'all'],
    queryFn: () => leaveRequestsApi.getAll(),
  });
  const { data: disciplineData, isLoading: discLoading } = useQuery({
    queryKey: ['discipline', 'all'],
    queryFn: () => disciplineApi.getAll({ limit: 200 }),
  });

  const leaveList: any[] = (leaveData as any)?.data ?? (Array.isArray(leaveData) ? leaveData : []);
  const discList: DisciplineIncident[] = (disciplineData as any)?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      leaveRequestsApi.review(id, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: "So'rov ko'rib chiqildi" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => disciplineApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipline'] });
      toast({ title: 'Intizom holati hal etildi' });
    },
  });

  // ── Build unified approval list ────────────────────────────────────────────
  const approvals: ApprovalItem[] = useMemo(() => {
    const items: ApprovalItem[] = [];

    leaveList.forEach((r: any) => {
      items.push({
        id: `leave-${r.id}`,
        type: 'leave',
        status: r.status,
        requesterName: `${r.requester?.firstName ?? ''} ${r.requester?.lastName ?? ''}`.trim() || 'Noma\'lum',
        requesterRole: r.requester?.role,
        branchName: r.requester?.branch?.name,
        reason: r.reason,
        createdAt: r.createdAt,
        startDate: r.startDate,
        endDate: r.endDate,
        raw: r,
      });
    });

    discList.forEach((d: any) => {
      items.push({
        id: `disc-${d.id}`,
        type: 'discipline',
        status: d.resolved ? 'resolved' : 'pending',
        requesterName: `${d.student?.firstName ?? ''} ${d.student?.lastName ?? ''}`.trim() || 'Noma\'lum',
        requesterRole: d.student?.class?.name,
        branchName: undefined,
        reason: d.description,
        createdAt: d.createdAt,
        severity: d.severity,
        raw: d,
      });
    });

    // Sort: pending first, then by date desc
    return items.sort((a, b) => {
      const aPending = a.status === 'pending' ? 1 : 0;
      const bPending = b.status === 'pending' ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leaveList, discList]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return approvals.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (filterStatus !== 'all') {
        if (filterStatus === 'pending' && a.status !== 'pending') return false;
        if (filterStatus === 'resolved' && a.status === 'pending') return false;
      }
      return true;
    });
  }, [approvals, filterType, filterStatus]);

  const selectedItem = approvals.find((a) => a.id === selectedId) ?? null;

  // ── Multi-select handlers ──────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((f) => f.id)));
    }
  }, [filtered, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const bulkActions = [
    {
      id: 'approve',
      label: 'Tasdiqlash',
      icon: CheckCircle2,
      tone: 'primary' as const,
      onClick: (ids: string[]) => {
        ids.forEach((id) => {
          if (id.startsWith('leave-')) {
            reviewMutation.mutate({ id: id.replace('leave-', ''), action: 'approve' });
          }
        });
        clearSelection();
      },
    },
    {
      id: 'reject',
      label: 'Rad etish',
      icon: XCircle,
      tone: 'danger' as const,
      onClick: (ids: string[]) => {
        ids.forEach((id) => {
          if (id.startsWith('leave-')) {
            reviewMutation.mutate({ id: id.replace('leave-', ''), action: 'reject' });
          }
        });
        clearSelection();
      },
    },
    {
      id: 'resolve',
      label: 'Hal etish',
      icon: CheckCircle2,
      tone: 'primary' as const,
      onClick: (ids: string[]) => {
        ids.forEach((id) => {
          if (id.startsWith('disc-')) {
            resolveMutation.mutate(id.replace('disc-', ''));
          }
        });
        clearSelection();
      },
    },
  ];

  const isLoading = leaveLoading || discLoading;
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
            Tasdiqlash inbox
          </h1>
          {pendingCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              {pendingCount} ta kutilmoqda
            </span>
          )}
        </div>
      </div>

      <SplitView
        showDetail={!!selectedId}
        onHideDetail={() => setSelectedId(null)}
        listWidth="min-w-0 lg:w-[420px] xl:w-[460px]"
      >
        {/* ── LIST PANE ────────────────────────────────────────────────────── */}
        <>
          <SplitViewListHeader>
            <div className="flex items-center gap-2">
              {/* Select all */}
              <button
                onClick={selectAllVisible}
                className="flex items-center justify-center h-6 w-6 rounded hover:bg-xedu-slate-100 transition-colors"
              >
                {selectedIds.size === filtered.length && filtered.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-xedu-primary" />
                ) : selectedIds.size > 0 ? (
                  <div className="h-4 w-4 rounded-sm border-2 border-xedu-primary bg-xedu-primary-light relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-0.5 w-2 bg-xedu-primary rounded-full" />
                    </div>
                  </div>
                ) : (
                  <Square className="h-4 w-4 text-xedu-slate-300" />
                )}
              </button>
              <span className="text-[11px] font-semibold text-xedu-slate-500">
                {filtered.length} ta
              </span>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1">
              <FilterChip active={filterType === 'all'} onClick={() => setFilterType('all')}>
                Barchasi
              </FilterChip>
              <FilterChip active={filterType === 'leave'} onClick={() => setFilterType('leave')}>
                Ta'til
              </FilterChip>
              <FilterChip active={filterType === 'discipline'} onClick={() => setFilterType('discipline')}>
                Intizom
              </FilterChip>
            </div>
          </SplitViewListHeader>

          <SplitViewListBody>
            {isLoading ? (
              <div className="space-y-0">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-[52px] rounded-none mx-3 my-1" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <CheckCircle2 className="h-6 w-6 text-xedu-slate-300" />
                <p className="text-sm text-xedu-slate-500">Tasdiqlash uchun element yo&apos;q</p>
              </div>
            ) : (
              <div className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
                {filtered.map((item) => (
                  <ApprovalRow
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    checked={selectedIds.has(item.id)}
                    onSelect={() => setSelectedId(item.id)}
                    onToggleCheck={() => toggleSelect(item.id)}
                  />
                ))}
              </div>
            )}
          </SplitViewListBody>
        </>

        {/* ── DETAIL PANE ──────────────────────────────────────────────────── */}
        <AuditDetailPane
          empty={!selectedItem}
          title={selectedItem?.reason ?? ''}
          subtitle={selectedItem?.type === 'leave' ? "Ta'til so'rovi" : 'Intizom holati'}
          status={selectedItem?.status as any}
          requester={selectedItem ? { name: selectedItem.requesterName, role: selectedItem.requesterRole } : undefined}
          branch={selectedItem?.branchName}
          createdAt={selectedItem?.createdAt}
          events={buildEvents(selectedItem)}
          actions={
            selectedItem ? (
              <div className="flex items-center gap-2">
                {selectedItem.type === 'leave' && selectedItem.status === 'pending' && (
                  <>
                    <button
                      onClick={() => reviewMutation.mutate({ id: selectedItem.raw.id, action: 'approve' })}
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-xedu-primary text-white hover:bg-xedu-primary-hover transition-colors disabled:opacity-50"
                    >
                      {reviewMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tasdiqlash
                    </button>
                    <button
                      onClick={() => reviewMutation.mutate({ id: selectedItem.raw.id, action: 'reject' })}
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rad etish
                    </button>
                  </>
                )}
                {selectedItem.type === 'discipline' && selectedItem.status === 'pending' && (
                  <button
                    onClick={() => resolveMutation.mutate(selectedItem.raw.id)}
                    disabled={resolveMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-xedu-primary text-white hover:bg-xedu-primary-hover transition-colors disabled:opacity-50"
                  >
                    {resolveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Hal etish
                  </button>
                )}
              </div>
            ) : null
          }
        />
      </SplitView>

      {/* Floating bulk toolbar */}
      <FloatingBulkToolbar
        visible={selectedIds.size >= 1}
        selectedIds={Array.from(selectedIds)}
        actions={bulkActions}
        onClear={clearSelection}
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors',
        active
          ? 'bg-xedu-slate-900 text-white dark:bg-white dark:text-xedu-slate-900'
          : 'text-xedu-slate-500 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800'
      )}
    >
      {children}
    </button>
  );
}

function ApprovalRow({
  item,
  selected,
  checked,
  onSelect,
  onToggleCheck,
}: {
  item: ApprovalItem;
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
}) {
  const isPending = item.status === 'pending';
  const age = getAgeLabel(item.createdAt);

  return (
    <div
      className={cn(
        'relative flex items-start gap-2 px-3 py-2.5 transition-colors cursor-pointer',
        selected
          ? 'bg-xedu-primary-light/30 border-l-2 border-l-xedu-primary'
          : 'border-l-2 border-l-transparent hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40',
        !isPending && 'opacity-60'
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-check]')) return;
        onSelect();
      }}
    >
      {/* Checkbox */}
      <button
        data-check
        onClick={(e) => { e.stopPropagation(); onToggleCheck(); }}
        className="mt-0.5 shrink-0"
      >
        {checked ? (
          <CheckSquare className="h-4 w-4 text-xedu-primary" />
        ) : (
          <Square className="h-4 w-4 text-xedu-slate-300" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TypeBadge type={item.type} />
          {item.severity && <SeverityBadge severity={item.severity} />}
          {isPending && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
              <Clock className="h-2.5 w-2.5" />
              {age}
            </span>
          )}
        </div>
        <p className="text-[13px] font-semibold text-xedu-slate-800 dark:text-xedu-slate-200 truncate leading-snug">
          {item.requesterName}
        </p>
        <p className="text-[11px] text-xedu-slate-500 truncate mt-0.5">{item.reason}</p>
        <div className="flex items-center gap-2 mt-1">
          {item.branchName && (
            <span className="text-[10px] text-xedu-slate-400 flex items-center gap-0.5">
              <Building2 className="h-2.5 w-2.5" />
              {item.branchName}
            </span>
          )}
          {item.startDate && item.endDate && (
            <span className="text-[10px] text-xedu-slate-400 flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(item.startDate)} – {formatDate(item.endDate)}
            </span>
          )}
        </div>
      </div>

      {/* Status dot */}
      <div className="shrink-0 mt-1">
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            isPending ? 'bg-amber-500' : 'bg-xedu-primary'
          )}
        />
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: ApprovalType }) {
  const config = {
    leave: { label: "Ta'til", bg: 'bg-blue-50 text-blue-600 border-blue-100' },
    discipline: { label: 'Intizom', bg: 'bg-red-50 text-red-600 border-red-100' },
  };
  const cfg = config[type];
  return (
    <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border', cfg.bg)}>
      {cfg.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
    severity === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
    'bg-xedu-slate-50 text-xedu-slate-500 border-xedu-slate-100';
  return (
    <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border', color)}>
      {severity}
    </span>
  );
}

function getAgeLabel(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Hozir';
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}

function buildEvents(item: ApprovalItem | null): { label: string; value: string; timestamp?: string; tone: 'calm' | 'attention' | 'urgent' | 'success' }[] {
  if (!item) return [];
  const events: any[] = [];

  events.push({
    label: 'So\'rov yuborildi',
    value: item.reason,
    timestamp: item.createdAt,
    tone: 'calm' as const,
  });

  if (item.type === 'leave' && item.startDate) {
    events.push({
      label: 'Boshlanish sanasi',
      value: formatDate(item.startDate),
      tone: 'calm' as const,
    });
    if (item.endDate) {
      events.push({
        label: 'Tugash sanasi',
        value: formatDate(item.endDate),
        tone: 'calm' as const,
      });
    }
  }

  if (item.type === 'discipline') {
    events.push({
      label: 'Jiddiyati',
      value: item.severity ?? "Noma'lum",
      tone: (item.severity === 'high' ? 'urgent' : item.severity === 'medium' ? 'attention' : 'calm') as any,
    });
  }

  if (item.status === 'approved') {
    events.push({ label: 'Tasdiqlandi', value: "Ko'rib chiqildi", tone: 'success' as const });
  } else if (item.status === 'rejected') {
    events.push({ label: 'Rad etildi', value: "So'rov rad etildi", tone: 'urgent' as const });
  } else if (item.status === 'resolved') {
    events.push({ label: 'Hal etildi', value: 'Holat yopildi', tone: 'success' as const });
  }

  return events;
}
