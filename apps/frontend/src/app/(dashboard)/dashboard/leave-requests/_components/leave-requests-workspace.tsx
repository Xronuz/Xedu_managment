'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/store/confirm.store';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { formatDate, getInitials, getRoleLabel, cn } from '@/lib/utils';
import Link from 'next/link';

import {
  CalendarOff, Plus, CheckCircle2, XCircle, Clock, Loader2,
  Calendar, MessageSquare, User, Search, X, Filter, Eye,
  ArrowRight, BarChart3, TrendingUp, AlertTriangle, Users,
  School, MonitorPlay, Check, Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import {
  WorkspaceShell, WorkspaceHeader, WorkspaceToolbar, WorkspaceMain, WorkspaceSidebar, WorkspaceSection,
  StatPill, QuickLink, InfoItem
} from '@/components/workspace-system';
import { OpTable } from '@/components/workspace-system/op-table';
import {
  PrimaryAction, SecondaryAction, IconAction, ActionBar,
} from '@/components/workspace-system/action-bar';
import { EntityPanel, EntityPanelProps } from '@/components/workspace-system/entity-panel';
import { FloatingBulkToolbar } from '@/components/director-workspace/floating-bulk-toolbar';

/* ═══════════════════════════════════════════════════════════════════════════════
   LEAVE REQUESTS WORKSPACE
   Institutional staffing continuity workspace.
   Workflow-driven, staffing-aware, approval-aware.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface LeaveApproval {
  id: string;
  approverId: string;
  status: string;
  comment?: string;
  decidedAt?: string;
  approver?: { id: string; firstName: string; lastName: string; role: string };
}

interface LeaveRequest {
  id: string;
  requesterId: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: string;
  type?: string;
  createdAt: string;
  requester?: { id: string; firstName: string; lastName: string; role: string };
  approvals?: LeaveApproval[];
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; badge: string }> = {
  pending:   { label: 'Kutilmoqda',    dot: 'bg-amber-400', text: 'text-amber-600', badge: 'border-amber-200 bg-amber-50 text-amber-600' },
  approved:  { label: 'Tasdiqlandi',   dot: 'bg-xedu-primary', text: 'text-xedu-primary', badge: 'border-xedu-primary-light bg-xedu-primary-light text-xedu-primary' },
  rejected:  { label: 'Rad etildi',    dot: 'bg-red-500', text: 'text-red-600', badge: 'border-red-200 bg-red-50 text-red-600' },
  cancelled: { label: 'Bekor qilindi', dot: 'bg-xedu-slate-400', text: 'text-xedu-slate-500', badge: 'border-xedu-slate-200 bg-xedu-slate-50 text-xedu-slate-500' },
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: 'Kasallik', personal: 'Shaxsiy', family: 'Oilaviy', other: 'Boshqa',
};

const LEAVE_TYPE_OPTIONS = [
  { value: '', label: 'Barcha turlar' },
  { value: 'sick', label: 'Kasallik' },
  { value: 'personal', label: 'Shaxsiy' },
  { value: 'family', label: 'Oilaviy' },
  { value: 'other', label: 'Boshqa' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'approved', label: 'Tasdiqlandi' },
  { value: 'rejected', label: 'Rad etildi' },
  { value: 'cancelled', label: 'Bekor qilindi' },
];

const EMPTY_FORM = { reason: '', startDate: '', endDate: '', type: 'personal' as 'sick' | 'personal' | 'family' | 'other' };

// ── Leave Request Entity Panel ────────────────────────────────────────────────

function LeaveRequestPanel({ request, open, onClose, canReview, onApprove, onReject }: {
  request: LeaveRequest | null;
  open: boolean;
  onClose: () => void;
  canReview: boolean;
  onApprove?: (req: LeaveRequest) => void;
  onReject?: (req: LeaveRequest) => void;
}) {
  const router = useRouter();
  if (!request) return null;

  const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
  const durationDays = Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-base font-bold text-xedu-slate-500">
              {getInitials(request.requester?.firstName ?? '', request.requester?.lastName ?? '')}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
                {request.requester?.firstName} {request.requester?.lastName}
              </p>
              <p className="text-xs text-xedu-slate-500">{getRoleLabel(request.requester?.role ?? '')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={Calendar} label="Boshlanish" value={formatDate(request.startDate)} />
            <InfoItem icon={Calendar} label="Tugash" value={formatDate(request.endDate)} />
            <InfoItem icon={Clock} label="Davomiylik" value={`${durationDays} kun`} />
            <InfoItem icon={User} label="Tur" value={LEAVE_TYPE_LABELS[request.type ?? ''] ?? request.type ?? 'Boshqa'} />
          </div>

          <div>
            <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1">Sabab</p>
            <p className="text-xs text-xedu-slate-700 bg-xedu-slate-50 dark:bg-xedu-slate-800 rounded-md px-2.5 py-2">
              {request.reason}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {canReview && request.status === 'pending' && onApprove && onReject && (
              <>
                <PrimaryAction icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onApprove(request)}>
                  Tasdiqlash
                </PrimaryAction>
                <SecondaryAction icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => onReject(request)}>
                  Rad etish
                </SecondaryAction>
              </>
            )}
            {request.requester?.id && (
              <SecondaryAction icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/messages?userId=${request.requesterId}`; }}>
                Xabar
              </SecondaryAction>
            )}
            <SecondaryAction icon={<MonitorPlay className="h-3.5 w-3.5" />} onClick={() => router.push('/dashboard/schedule')}>
              Jadval
            </SecondaryAction>
          </div>
        </div>
      ),
    },
    {
      id: 'approvals',
      label: 'Tasdiqlovchilar',
      content: (
        <div className="p-5">
          {!request.approvals || request.approvals.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <User className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Tasdiqlovchi tayinlanmagan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {request.approvals.map((approval) => {
                const aCfg = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.pending;
                return (
                  <div key={approval.id} className="flex items-start gap-3 rounded-md border border-xedu-slate-100 dark:border-xedu-slate-800 px-3 py-2.5">
                    <div className="h-8 w-8 rounded-full bg-xedu-slate-100 flex items-center justify-center text-2xs font-bold text-xedu-slate-500 shrink-0">
                      {getInitials(approval.approver?.firstName ?? '', approval.approver?.lastName ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{approval.approver?.firstName} {approval.approver?.lastName}</span>
                        <span className={cn('inline-flex items-center gap-1 text-2xs font-bold px-1.5 py-0.5 rounded border', aCfg.badge)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', aCfg.dot)} />
                          {aCfg.label}
                        </span>
                      </div>
                      {approval.comment && (
                        <p className="text-xs text-xedu-slate-500 mt-0.5 italic">{approval.comment}</p>
                      )}
                      {approval.decidedAt && (
                        <p className="text-2xs text-xedu-slate-400 mt-0.5">{formatDate(approval.decidedAt)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <EntityPanel
      open={open}
      onClose={onClose}
      entityType="default"
      title="Ta'til so'rovi"
      subtitle={`${request.requester?.firstName} ${request.requester?.lastName}`}
      status={request.status as EntityPanelProps['status']}
      metrics={[
        { label: 'Boshlanish', value: formatDate(request.startDate), tone: 'calm' },
        { label: 'Tugash', value: formatDate(request.endDate), tone: 'calm' },
        { label: 'Davomiylik', value: `${durationDays} kun`, tone: 'calm' },
      ]}
      tabs={tabs}
    />
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────




// ── Main Workspace ────────────────────────────────────────────────────────────

export function LeaveRequestsWorkspace() {
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ask = useConfirm();

  const isApprover = ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '');
  const canReview = ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '');

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    window.clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = window.setTimeout(() => setDebouncedSearch(v), 300);
  }, []);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: requests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests', filterStatus, activeBranchId],
    queryFn: () => leaveRequestsApi.getAll({ status: filterStatus || undefined }),
  });

  // ── Filtered requests ────────────────────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const name = r.requester ? `${r.requester.firstName} ${r.requester.lastName}`.toLowerCase() : '';
        const reason = r.reason?.toLowerCase() ?? '';
        if (!name.includes(q) && !reason.includes(q)) return false;
      }
      if (filterType && r.type !== filterType) return false;
      return true;
    });
  }, [requests, debouncedSearch, filterType]);

  // ── Selection + Panel ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelRequest, setPanelRequest] = useState<LeaveRequest | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map((r) => r.id));
    }
  }, [selectedIds.length, filteredRequests]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Create modal ─────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreateOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.reason.trim() || form.reason.trim().length < 5) e.reason = "Sabab kamida 5 ta belgi bo'lishi kerak";
    if (!form.startDate) e.startDate = 'Boshlanish sanasi tanlang';
    if (!form.endDate) e.endDate = 'Tugash sanasi tanlang';
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "Tugash sanasi boshlanishdan keyin bo'lishi kerak";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: leaveRequestsApi.create,
    onSuccess: () => {
      toast({ title: "Ta'til so'rovi yuborildi. Tasdiqlash kutilmoqda." });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleCreate = () => {
    if (!validate()) return;
    createMutation.mutate(form);
  };

  // ── Review modal ─────────────────────────────────────────────────────────────
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');

  const openReview = (req: LeaveRequest, action: 'approve' | 'reject') => {
    setReviewTarget(req);
    setReviewAction(action);
    setReviewComment('');
    setReviewOpen(true);
  };

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: 'approve' | 'reject'; comment?: string }) =>
      leaveRequestsApi.review(id, { action, comment }),
    onSuccess: (_, vars) => {
      toast({ title: vars.action === 'approve' ? "So'rov tasdiqlandi" : "So'rov rad etildi" });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setReviewOpen(false);
      setPanelRequest(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: leaveRequestsApi.cancel,
    onSuccess: () => {
      toast({ title: "So'rov bekor qilindi" });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  // ── Active filter chips ──────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterStatus) {
      const label = STATUS_OPTIONS.find(s => s.value === filterStatus)?.label ?? filterStatus;
      chips.push({ key: 'status', label, onClear: () => setFilterStatus('') });
    }
    if (filterType) {
      const label = LEAVE_TYPE_OPTIONS.find(t => t.value === filterType)?.label ?? filterType;
      chips.push({ key: 'type', label, onClear: () => setFilterType('') });
    }
    return chips;
  }, [filterStatus, filterType]);

  // ── Intelligence ─────────────────────────────────────────────────────────────
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
  const cancelledCount = requests.filter((r) => r.status === 'cancelled').length;

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const approvedThisWeek = requests.filter((r) => {
    if (r.status !== 'approved') return false;
    const d = new Date(r.createdAt);
    return d >= startOfWeek && d <= endOfWeek;
  }).length;

  const overlappingRequests = useMemo(() => {
    const overlaps: { req: LeaveRequest; overlapsWith: LeaveRequest[] }[] = [];
    const pendingReqs = requests.filter(r => r.status === 'pending');
    for (let i = 0; i < pendingReqs.length; i++) {
      const a = pendingReqs[i];
      const aStart = new Date(a.startDate).getTime();
      const aEnd = new Date(a.endDate).getTime();
      const overlapsWith = pendingReqs.filter((b, j) => {
        if (i === j) return false;
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();
        return aStart <= bEnd && bStart <= aEnd;
      });
      if (overlapsWith.length > 0) overlaps.push({ req: a, overlapsWith });
    }
    return overlaps.slice(0, 5);
  }, [requests]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach((r) => { map.set(r.type ?? 'other', (map.get(r.type ?? 'other') || 0) + 1); });
    return Array.from(map.entries()).map(([type, count]) => ({ type, count, label: LEAVE_TYPE_LABELS[type] ?? type }))
      .sort((a, b) => b.count - a.count);
  }, [requests]);

  const myPendingApprovals = useMemo(() => {
    if (!canReview) return [];
    return requests.filter((r) => {
      if (r.status !== 'pending') return false;
      return r.approvals?.some((a) => a.approverId === user?.id && a.status === 'pending');
    }).slice(0, 5);
  }, [requests, canReview, user?.id]);

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'requester',
      header: "So'rovchi",
      cell: (r: LeaveRequest) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-2xs font-bold text-xedu-slate-500">
            {getInitials(r.requester?.firstName ?? '', r.requester?.lastName ?? '')}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 text-xs truncate">
              {r.requester ? `${r.requester.firstName} ${r.requester.lastName}` : "Noma'lum"}
            </p>
            <p className="text-2xs text-xedu-slate-400">{getRoleLabel(r.requester?.role ?? '')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tur',
      width: '80px',
      cell: (r: LeaveRequest) => (
        <span className="text-xs font-medium text-xedu-slate-600">{LEAVE_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—'}</span>
      ),
    },
    {
      key: 'dates',
      header: 'Sanalar',
      width: '130px',
      cell: (r: LeaveRequest) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-xedu-slate-400 shrink-0" />
          <span className="text-xs text-xedu-slate-600">
            {formatDate(r.startDate)} – {formatDate(r.endDate)}
          </span>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Kun',
      width: '50px',
      align: 'center' as const,
      cell: (r: LeaveRequest) => {
        const days = Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return <span className="text-xs font-bold text-xedu-slate-700">{days}</span>;
      },
    },
    {
      key: 'status',
      header: 'Holat',
      width: '90px',
      cell: (r: LeaveRequest) => {
        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
        return (
          <span className={cn('inline-flex items-center gap-1 text-2xs font-bold px-1.5 py-0.5 rounded border', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'created',
      header: 'Yuborildi',
      width: '80px',
      cell: (r: LeaveRequest) => (
        <span className="text-xs text-xedu-slate-400">{formatDate(r.createdAt)}</span>
      ),
    },
  ], []);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="Ta'til so'rovlari"
          subtitle={`${requests.length} ta so'rov · ${pendingCount} ta kutilmoqda`}
          icon={<CalendarOff className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            <ActionBar
              primary={
                <PrimaryAction onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                  So&apos;rov yuborish
                </PrimaryAction>
              }
            />
          }
        />
      </div>

      {/* Toolbar */}
      <div className="w-full lg:col-span-2">
        <WorkspaceToolbar sticky className="flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-xedu-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ism, sabab..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-800 dark:text-xedu-slate-200 outline-none focus:ring-1 focus:ring-xedu-primary"
            />
            {search && (
              <button onClick={() => { setSearch(''); setDebouncedSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-xedu-slate-400" />
              </button>
            )}
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
              <button onClick={f.onClear} className="hover:text-red-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {activeFilters.length > 0 && (
            <button
              onClick={() => { setFilterStatus(''); setFilterType(''); }}
              className="text-xs font-semibold text-xedu-slate-400 hover:text-red-500 transition-colors"
            >
              Tozalash
            </button>
          )}
        </WorkspaceToolbar>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pb-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              {LEAVE_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main: Leave requests table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={filteredRequests}
          rowKey={(r) => r.id}
          density="compact"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          rowTone={(r) => {
            if (r.status === 'pending') return 'attention';
            if (r.status === 'rejected') return 'urgent';
            if (r.status === 'approved') return 'success';
            return 'muted';
          }}
          rowActions={(r) => {
            const myApproval = r.approvals?.find((a) => a.approverId === user?.id);
            const canReviewThis = canReview && r.status === 'pending' && myApproval?.status === 'pending';
            const isMine = r.requesterId === user?.id;
            return (
              <>
                <IconAction
                  icon={<Eye className="h-3.5 w-3.5" />}
                  title="Ko'rish"
                  onClick={() => setPanelRequest(r)}
                  tone="primary"
                />
                {canReviewThis && (
                  <IconAction
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    title="Tasdiqlash"
                    onClick={() => openReview(r, 'approve')}
                    tone="primary"
                  />
                )}
                {canReviewThis && (
                  <IconAction
                    icon={<XCircle className="h-3.5 w-3.5" />}
                    title="Rad etish"
                    onClick={() => openReview(r, 'reject')}
                  />
                )}
                <IconAction
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  title="Xabar"
                  onClick={() => { window.location.href = `/dashboard/messages?userId=${r.requesterId}`; }}
                />
                {isMine && r.status === 'pending' && (
                  <IconAction
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    title="Bekor qilish"
                    tone="danger"
                    onClick={() => cancelMutation.mutate(r.id)}
                  />
                )}
              </>
            );
          }}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CalendarOff className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">So&apos;rovlar yo&apos;q</p>
              <p className="text-xs text-xedu-slate-400">
                {filterStatus || filterType ? 'Tanlangan filterlar bo&apos;yicha hech narsa topilmadi' : "Yuqoridagi '+ So'rov yuborish' tugmasini bosing"}
              </p>
            </div>
          }
        />
      </WorkspaceMain>

      {/* Right sidebar: Staffing continuity intelligence */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Umumiy ko'rsatkichlar" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={requests.length} />
            <StatPill label="Kutilmoqda" value={pendingCount} tone={pendingCount > 0 ? 'attention' : 'calm'} />
            <StatPill label="Tasdiqlandi" value={approvedCount} tone="success" />
            <StatPill label="Rad etildi" value={rejectedCount} tone={rejectedCount > 0 ? 'urgent' : 'calm'} />
            <StatPill label="Bekor qilindi" value={cancelledCount} />
            <StatPill label="Bu hafta" value={approvedThisWeek} tone="success" />
          </div>
        </WorkspaceSection>

        {canReview && myPendingApprovals.length > 0 && (
          <WorkspaceSection title="Mening tasdiqlashim" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
            <div className="space-y-1">
              {myPendingApprovals.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setPanelRequest(r)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">
                      {r.requester?.firstName} {r.requester?.lastName}
                    </p>
                    <p className="text-2xs text-xedu-slate-400">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {overlappingRequests.length > 0 && (
          <WorkspaceSection title="Ustma-ust tushish" icon={<AlertTriangle className="h-4 w-4 text-red-500" />}>
            <div className="space-y-1">
              {overlappingRequests.map((o) => (
                <button
                  key={o.req.id}
                  onClick={() => setPanelRequest(o.req)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">
                      {o.req.requester?.firstName} {o.req.requester?.lastName}
                    </p>
                    <p className="text-2xs text-xedu-slate-400">
                      {o.overlapsWith.length} ta ustma-ust tushish
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {typeBreakdown.length > 0 && (
          <WorkspaceSection title="Tur bo'yicha" icon={<TrendingUp className="h-4 w-4" />}>
            <div className="space-y-1">
              {typeBreakdown.map((t) => (
                <div key={t.type} className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium text-xedu-slate-600">{t.label}</span>
                  <span className="text-xs font-bold tabular-nums text-xedu-slate-700">{t.count}</span>
                </div>
              ))}
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/schedule" icon={MonitorPlay} label="Jadval" />
            <QuickLink href="/dashboard/staff" icon={Users} label="Xodimlar" />
            <QuickLink href="/dashboard/attendance" icon={CheckCircle2} label="Davomat" />
            <QuickLink href="/dashboard/reports" icon={BarChart3} label="Hisobotlar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Leave Request Entity Panel */}
      <LeaveRequestPanel
        request={panelRequest}
        open={!!panelRequest}
        onClose={() => setPanelRequest(null)}
        canReview={canReview && !!panelRequest && panelRequest.status === 'pending' && !!panelRequest.approvals?.find((a) => a.approverId === user?.id && a.status === 'pending')}
        onApprove={canReview ? (req: LeaveRequest) => openReview(req, 'approve') : undefined}
        onReject={canReview ? (req: LeaveRequest) => openReview(req, 'reject') : undefined}
      />

      {/* Bulk toolbar */}
      <FloatingBulkToolbar
        visible={selectedIds.length >= 1}
        selectedIds={selectedIds}
        actions={[
          {
            id: 'export',
            label: 'Export',
            icon: ArrowRight,
            tone: 'neutral',
            onClick: () => toast({ title: `${selectedIds.length} ta so'rov export qilindi` }),
          },
        ]}
        onClear={clearSelection}
      />

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ta'til so'rovi yuborish</DialogTitle>
            <DialogDescription>So'rovingiz direktor va o'quv ishlari bo'yicha direktori tomonidan ko'rib chiqiladi</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Ta'til turi</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as 'sick' | 'personal' | 'family' | 'other' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPE_OPTIONS.filter(t => t.value).map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Boshlanish sanasi <span className="text-xedu-ruby">*</span></Label>
                <Input type="date" value={form.startDate} onChange={e => { setForm(f => ({ ...f, startDate: e.target.value })); setFormErrors(er => { const n = { ...er }; delete n.startDate; return n; }); }} />
                {formErrors.startDate && <p className="text-xs text-xedu-ruby">{formErrors.startDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tugash sanasi <span className="text-xedu-ruby">*</span></Label>
                <Input type="date" value={form.endDate} onChange={e => { setForm(f => ({ ...f, endDate: e.target.value })); setFormErrors(er => { const n = { ...er }; delete n.endDate; return n; }); }} />
                {formErrors.endDate && <p className="text-xs text-xedu-ruby">{formErrors.endDate}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sabab <span className="text-xedu-ruby">*</span></Label>
              <Textarea placeholder="Ta'tilga chiqish sababini kiriting..." rows={4} value={form.reason} onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setFormErrors(er => { const n = { ...er }; delete n.reason; return n; }); }} className="resize-none" />
              {formErrors.reason && <p className="text-xs text-xedu-ruby">{formErrors.reason}</p>}
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-medium">Diqqat</p>
              <p>So'rovingiz direktor va o'quv ishlari bo'yicha direktorga yuboriladi. Ikkalasi ham tasdiqlasa so'rovingiz qabul qilinadi.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? "So'rovni tasdiqlash" : "So'rovni rad etish"}
            </DialogTitle>
            {reviewTarget && (
              <DialogDescription>
                {reviewTarget.requester?.firstName} {reviewTarget.requester?.lastName} •{' '}
                {formatDate(reviewTarget.startDate)} – {formatDate(reviewTarget.endDate)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 py-2">
            {reviewTarget && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">Sabab:</p>
                <p>{reviewTarget.reason}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea placeholder={reviewAction === 'approve' ? "Tasdiqlash izohi..." : "Rad etish sababi..."} rows={3} className="resize-none" value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Bekor</Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={() => reviewMutation.mutate({ id: reviewTarget?.id!, action: reviewAction, comment: reviewComment || undefined })}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === 'approve' ? 'Tasdiqlash' : 'Rad etish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
