'use client';

import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@/components/workspace-system/use-debounced-value';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { teacherSubstitutionsApi, type SubstitutionItem } from '@/lib/api/teacher-substitutions';
import { ScheduleRepairPanel } from '@/components/schedule/schedule-repair-panel';
import { formatDate, getInitials, cn } from '@/lib/utils';

import {
  Users, Plus, CheckCircle2, XCircle, Clock, Loader2,
  Calendar, Search, X, Filter, Eye, AlertTriangle,
  UserCheck, UserX, MonitorPlay, Check, Ban, ArrowRight, Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

import {
  WorkspaceShell, WorkspaceHeader, WorkspaceToolbar, WorkspaceMain, WorkspaceSidebar, WorkspaceSection,
  StatPill, QuickLink, InfoItem
} from '@/components/workspace-system';
import { OpTable } from '@/components/workspace-system/op-table';
import {
  PrimaryAction, SecondaryAction, IconAction, ActionBar,
} from '@/components/workspace-system/action-bar';
import { EntityPanel, type EntityPanelProps } from '@/components/workspace-system/entity-panel';

/* ═══════════════════════════════════════════════════════════════════════════════
   TEACHER SUBSTITUTIONS WORKSPACE
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; badge: string }> = {
  proposed:  { label: 'Taklif',       dot: 'bg-xedu-amber-400',  text: 'text-xedu-amber-600',  badge: 'border-xedu-amber-200 bg-xedu-amber-50 text-xedu-amber-600' },
  approved:  { label: 'Tasdiqlandi',  dot: 'bg-xedu-primary',    text: 'text-xedu-primary',    badge: 'border-xedu-primary-light bg-xedu-primary-light text-xedu-primary' },
  rejected:  { label: 'Rad etildi',   dot: 'bg-xedu-ruby-500',   text: 'text-xedu-ruby-600',   badge: 'border-xedu-ruby-200 bg-xedu-ruby-50 text-xedu-ruby-600' },
  applied:   { label: "Qo'llandi",    dot: 'bg-green-500',       text: 'text-green-600',       badge: 'border-green-200 bg-green-50 text-green-600' },
  cancelled: { label: 'Bekor qilindi',dot: 'bg-xedu-slate-400',  text: 'text-xedu-slate-500',  badge: 'border-xedu-slate-200 bg-xedu-slate-50 text-xedu-slate-500' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'proposed', label: 'Taklif' },
  { value: 'approved', label: 'Tasdiqlandi' },
  { value: 'applied', label: "Qo'llandi" },
  { value: 'rejected', label: 'Rad etildi' },
  { value: 'cancelled', label: 'Bekor qilindi' },
];

// ── Substitution Entity Panel ─────────────────────────────────────────────────

function SubstitutionPanel({ sub, open, onClose }: {
  sub: SubstitutionItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!sub) return null;

  const statusCfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.proposed;

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-base font-bold text-xedu-slate-500">
              {getInitials(sub.originalTeacher?.firstName ?? '', sub.originalTeacher?.lastName ?? '')}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
                {sub.originalTeacher?.firstName} {sub.originalTeacher?.lastName}
              </p>
              <p className="text-xs text-xedu-slate-500">Asl o'qituvchi</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-xedu-primary-light flex items-center justify-center text-base font-bold text-xedu-primary">
              {getInitials(sub.substituteTeacher?.firstName ?? '', sub.substituteTeacher?.lastName ?? '')}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
                {sub.substituteTeacher?.firstName} {sub.substituteTeacher?.lastName}
              </p>
              <p className="text-xs text-xedu-slate-500">O'rinbosar</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={Calendar} label="Sana" value={formatDate(sub.date)} />
            <InfoItem icon={MonitorPlay} label="Dars" value={`${sub.schedule?.subject?.name ?? ''} — ${sub.schedule?.class?.name ?? ''}`} />
            <InfoItem icon={Clock} label="Vaqt" value={`${sub.schedule?.startTime ?? ''}–${sub.schedule?.endTime ?? ''}`} />
            <InfoItem icon={Users} label="Filial" value={sub.branch?.name ?? ''} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className={cn('inline-flex items-center gap-1 text-2xs font-bold px-2 py-1 rounded border', statusCfg.badge)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
              {statusCfg.label}
            </span>
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
      title="Almashtirish"
      subtitle={`${sub.originalTeacher?.firstName} ${sub.originalTeacher?.lastName} → ${sub.substituteTeacher?.firstName} ${sub.substituteTeacher?.lastName}`}
      status={sub.status as EntityPanelProps['status']}
      metrics={[
        { label: 'Sana', value: formatDate(sub.date), tone: 'calm' },
        { label: 'Dars', value: sub.schedule?.subject?.name ?? '', tone: 'calm' },
        { label: 'Sinf', value: sub.schedule?.class?.name ?? '', tone: 'calm' },
      ]}
      tabs={tabs}
    />
  );
}

// ── Main Workspace ────────────────────────────────────────────────────────────

export function TeacherSubstitutionsWorkspace() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isManager = ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '');

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: listData, isLoading } = useQuery({
    queryKey: ['teacher-substitutions', filterStatus],
    queryFn: () => teacherSubstitutionsApi.list({ status: filterStatus || undefined, limit: 50 }),
  });

  const items = listData?.items ?? [];

  // ── Filtered items ───────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const original = r.originalTeacher ? `${r.originalTeacher.firstName} ${r.originalTeacher.lastName}`.toLowerCase() : '';
        const substitute = r.substituteTeacher ? `${r.substituteTeacher.firstName} ${r.substituteTeacher.lastName}`.toLowerCase() : '';
        const subject = r.schedule?.subject?.name?.toLowerCase() ?? '';
        const cls = r.schedule?.class?.name?.toLowerCase() ?? '';
        if (!original.includes(q) && !substitute.includes(q) && !subject.includes(q) && !cls.includes(q)) return false;
      }
      return true;
    });
  }, [items, debouncedSearch]);

  // ── Selection + Panel ────────────────────────────────────────────────────────
  const [panelSub, setPanelSub] = useState<SubstitutionItem | null>(null);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (id: string) => teacherSubstitutionsApi.approve(id),
    onSuccess: () => {
      toast({ title: 'Almashtirish tasdiqlandi' });
      queryClient.invalidateQueries({ queryKey: ['teacher-substitutions'] });
      setPanelSub(null);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (id: string) => teacherSubstitutionsApi.apply(id),
    onSuccess: () => {
      toast({ title: "Almashtirish qo'llandi" });
      queryClient.invalidateQueries({ queryKey: ['teacher-substitutions'] });
      setPanelSub(null);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => teacherSubstitutionsApi.reject(id, reason),
    onSuccess: () => {
      toast({ title: 'Almashtirish rad etildi' });
      queryClient.invalidateQueries({ queryKey: ['teacher-substitutions'] });
      setPanelSub(null);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => teacherSubstitutionsApi.cancel(id, reason),
    onSuccess: () => {
      toast({ title: 'Almashtirish bekor qilindi' });
      queryClient.invalidateQueries({ queryKey: ['teacher-substitutions'] });
      setPanelSub(null);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  // ── Review modal ─────────────────────────────────────────────────────────────
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<SubstitutionItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'reject' | 'cancel'>('reject');
  const [reviewReason, setReviewReason] = useState('');

  const openReview = (sub: SubstitutionItem, action: 'reject' | 'cancel') => {
    setReviewTarget(sub);
    setReviewAction(action);
    setReviewReason('');
    setReviewOpen(true);
  };

  // ── Active filter chips ──────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterStatus) {
      const label = STATUS_OPTIONS.find(s => s.value === filterStatus)?.label ?? filterStatus;
      chips.push({ key: 'status', label, onClear: () => setFilterStatus('') });
    }
    return chips;
  }, [filterStatus]);

  // ── Intelligence ─────────────────────────────────────────────────────────────
  const proposedCount = items.filter((r) => r.status === 'proposed').length;
  const approvedCount = items.filter((r) => r.status === 'approved').length;
  const appliedCount = items.filter((r) => r.status === 'applied').length;
  const rejectedCount = items.filter((r) => r.status === 'rejected').length;

  const pendingManagerAction = items.filter((r) =>
    r.status === 'proposed' || r.status === 'approved'
  );

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'originalTeacher',
      header: "Asl o'qituvchi",
      cell: (r: SubstitutionItem) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-2xs font-bold text-xedu-slate-500">
            {getInitials(r.originalTeacher?.firstName ?? '', r.originalTeacher?.lastName ?? '')}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 text-xs truncate">
              {r.originalTeacher ? `${r.originalTeacher.firstName} ${r.originalTeacher.lastName}` : "Noma'lum"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'substituteTeacher',
      header: "O'rinbosar",
      cell: (r: SubstitutionItem) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-xedu-primary-light flex items-center justify-center text-2xs font-bold text-xedu-primary">
            {getInitials(r.substituteTeacher?.firstName ?? '', r.substituteTeacher?.lastName ?? '')}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 text-xs truncate">
              {r.substituteTeacher ? `${r.substituteTeacher.firstName} ${r.substituteTeacher.lastName}` : "Noma'lum"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Dars',
      width: '140px',
      cell: (r: SubstitutionItem) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-xedu-slate-700">{r.schedule?.subject?.name ?? '—'}</span>
          <span className="text-2xs text-xedu-slate-400">{r.schedule?.class?.name ?? ''}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Sana',
      width: '100px',
      cell: (r: SubstitutionItem) => (
        <span className="text-xs text-xedu-slate-600">{formatDate(r.date)}</span>
      ),
    },
    {
      key: 'time',
      header: 'Vaqt',
      width: '80px',
      cell: (r: SubstitutionItem) => (
        <span className="text-xs text-xedu-slate-500">{r.schedule?.startTime ?? ''}–{r.schedule?.endTime ?? ''}</span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      width: '100px',
      cell: (r: SubstitutionItem) => {
        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.proposed;
        return (
          <span className={cn('inline-flex items-center gap-1 text-2xs font-bold px-1.5 py-0.5 rounded border', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
        );
      },
    },
  ], []);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="O'qituvchi almashtirishlari"
          subtitle={`${items.length} ta almashtirish · ${proposedCount} ta taklif`}
          icon={<Users className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            <ActionBar
              primary={
                <PrimaryAction icon={<Plus className="h-3.5 w-3.5" />}>
                  Yangi taklif
                </PrimaryAction>
              }
            />
          }
        />
      </div>

      {/* Toolbar */}
      <div className="w-full lg:col-span-2">
        <WorkspaceToolbar sticky>
          <div className="relative flex-1 min-w-[140px] sm:min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-xedu-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism, fan, sinf..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-800 dark:text-xedu-slate-200 outline-none focus:ring-1 focus:ring-xedu-primary"
            />
            {search && (
              <button onClick={() => { setSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2">
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
              <button onClick={f.onClear} className="hover:text-xedu-ruby-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </WorkspaceToolbar>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pb-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main: Substitutions table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={filteredItems}
          rowKey={(r) => r.id}
          density="compact"
          rowTone={(r) => {
            if (r.status === 'proposed') return 'attention';
            if (r.status === 'rejected') return 'urgent';
            if (r.status === 'applied') return 'success';
            return 'muted';
          }}
          rowActions={(r) => {
            const canAct = isManager;
            return (
              <>
                <IconAction
                  icon={<Eye className="h-3.5 w-3.5" />}
                  title="Ko'rish"
                  onClick={() => setPanelSub(r)}
                  tone="primary"
                />
                {canAct && r.status === 'proposed' && (
                  <IconAction
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    title="Tasdiqlash"
                    onClick={() => approveMutation.mutate(r.id)}
                    tone="primary"
                  />
                )}
                {canAct && r.status === 'approved' && (
                  <IconAction
                    icon={<Check className="h-3.5 w-3.5" />}
                    title="Qo'llash"
                    onClick={() => applyMutation.mutate(r.id)}
                    tone="primary"
                  />
                )}
                {canAct && ['proposed', 'approved'].includes(r.status) && (
                  <>
                    <IconAction
                      icon={<XCircle className="h-3.5 w-3.5" />}
                      title="Rad etish"
                      onClick={() => openReview(r, 'reject')}
                    />
                    <IconAction
                      icon={<Ban className="h-3.5 w-3.5" />}
                      title="Bekor qilish"
                      onClick={() => openReview(r, 'cancel')}
                      tone="danger"
                    />
                  </>
                )}
              </>
            );
          }}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">Almashtirishlar yo&apos;q</p>
              <p className="text-xs text-xedu-slate-400">
                {filterStatus ? 'Tanlangan filter bo\'yicha hech narsa topilmadi' : "Ta'til so'rovlaridan almashtirish yaratish mumkin"}
              </p>
            </div>
          }
        />
      </WorkspaceMain>

      {/* Right sidebar */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Umumiy ko'rsatkichlar" icon={<Users className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={items.length} />
            <StatPill label="Taklif" value={proposedCount} tone={proposedCount > 0 ? 'attention' : 'calm'} />
            <StatPill label="Tasdiqlandi" value={approvedCount} tone="success" />
            <StatPill label="Qo'llandi" value={appliedCount} tone="success" />
            <StatPill label="Rad etildi" value={rejectedCount} tone={rejectedCount > 0 ? 'urgent' : 'calm'} />
          </div>
        </WorkspaceSection>

        {isManager && pendingManagerAction.length > 0 && (
          <WorkspaceSection title="Harakat talab qilinadi" icon={<AlertTriangle className="h-4 w-4 text-xedu-amber-500" />}>
            <div className="space-y-1">
              {pendingManagerAction.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPanelSub(s)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <Clock className="h-3.5 w-3.5 text-xedu-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">
                      {s.originalTeacher?.firstName} {s.originalTeacher?.lastName}
                    </p>
                    <p className="text-2xs text-xedu-slate-400">
                      {formatDate(s.date)} · {s.schedule?.subject?.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {/* Schedule Repair Panel for first proposed substitution with leave request */}
        {isManager && pendingManagerAction.some(s => s.leaveRequest?.id) && (
          <WorkspaceSection title="Jadval ta'miri" icon={<Wrench className="h-4 w-4 text-primary" />}>
            <ScheduleRepairPanel
              input={{
                leaveRequestId: pendingManagerAction.find(s => s.leaveRequest?.id)?.leaveRequest?.id,
              }}
              onApplied={() => queryClient.invalidateQueries({ queryKey: ['teacher-substitutions'] })}
            />
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/leave-requests" icon={Calendar} label="Ta'til so'rovlari" />
            <QuickLink href="/dashboard/schedule" icon={MonitorPlay} label="Jadval" />
            <QuickLink href="/dashboard/staff" icon={UserCheck} label="Xodimlar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Substitution Entity Panel */}
      <SubstitutionPanel
        sub={panelSub}
        open={!!panelSub}
        onClose={() => setPanelSub(null)}
      />

      {/* Review modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'reject' ? 'Almashtirishni rad etish' : 'Almashtirishni bekor qilish'}
            </DialogTitle>
            {reviewTarget && (
              <DialogDescription>
                {reviewTarget.originalTeacher?.firstName} {reviewTarget.originalTeacher?.lastName} →{' '}
                {reviewTarget.substituteTeacher?.firstName} {reviewTarget.substituteTeacher?.lastName}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sabab (ixtiyoriy)</label>
              <textarea
                placeholder={reviewAction === 'reject' ? 'Rad etish sababi...' : 'Bekor qilish sababi...'}
                rows={3}
                className="w-full rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-800 dark:text-xedu-slate-200 outline-none focus:ring-1 focus:ring-xedu-primary p-2 resize-none"
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Bekor</Button>
            <Button
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
              onClick={() => {
                if (reviewAction === 'reject') {
                  rejectMutation.mutate({ id: reviewTarget?.id!, reason: reviewReason || undefined });
                } else {
                  cancelMutation.mutate({ id: reviewTarget?.id!, reason: reviewReason || undefined });
                }
              }}
              disabled={rejectMutation.isPending || cancelMutation.isPending}
            >
              {(rejectMutation.isPending || cancelMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === 'reject' ? 'Rad etish' : 'Bekor qilish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
