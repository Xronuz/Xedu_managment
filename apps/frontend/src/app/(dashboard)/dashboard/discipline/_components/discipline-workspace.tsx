'use client';

import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@/components/workspace-system/use-debounced-value';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, Plus, Trash2, CheckCircle2, AlertTriangle,
  Search, X, MessageSquare, Eye, ArrowRight, Filter,
  Users, School, ClipboardCheck, BarChart3, FileText,
  Clock, Calendar, UserCheck, HeartHandshake,
} from 'lucide-react';
import Link from 'next/link';
import { cn, getInitials } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useConfirm } from '@/store/confirm.store';
import { disciplineApi, DisciplineType, DisciplineSeverity, DisciplineAction, DisciplineIncident } from '@/lib/api/discipline';
import { classesApi } from '@/lib/api/classes';

import {
  WorkspaceShell,
  WorkspaceHeader,
  WorkspaceToolbar,
  WorkspaceMain,
  WorkspaceSidebar,
  WorkspaceSection,
  StatPill, QuickLink, InfoItem
} from '@/components/workspace-system';
import { OpTable } from '@/components/workspace-system/op-table';
import {
  PrimaryAction,
  SecondaryAction,
  IconAction,
  ActionBar,
} from '@/components/workspace-system/action-bar';
import { EntityPanel } from '@/components/workspace-system/entity-panel';
import { FloatingBulkToolbar } from '@/components/director-workspace/floating-bulk-toolbar';

/* ═══════════════════════════════════════════════════════════════════════════════
   DISCIPLINE WORKSPACE
   Institutional student support + behavior operations workspace.
   Support-oriented, not punitive.
   ═══════════════════════════════════════════════════════════════════════════════ */

const TYPE_LABELS: Record<DisciplineType, string> = {
  behavior: 'Xulq-atvor',
  absence: 'Darsga kelmagan',
  academic: 'Akademik',
  dress_code: 'Kiyim-kechak',
  other: 'Boshqa',
};

const SEVERITY_CONFIG: Record<DisciplineSeverity, { label: string; dot: string; text: string; badge: string }> = {
  low:    { label: 'Past',    dot: 'bg-xedu-amber-400', text: 'text-xedu-amber-600', badge: 'border-xedu-amber-200 bg-xedu-amber-50 text-xedu-amber-600' },
  medium: { label: "O'rta",  dot: 'bg-xedu-amber-500', text: 'text-xedu-amber-600', badge: 'border-xedu-amber-200 bg-xedu-amber-50 text-xedu-amber-600' },
  high:   { label: 'Yuqori', dot: 'bg-xedu-ruby-500',    text: 'text-xedu-ruby-600',    badge: 'border-xedu-ruby-200 bg-xedu-ruby-50 text-xedu-ruby-600' },
};

const ACTION_LABELS: Record<DisciplineAction, string> = {
  warning:        'Ogohlantirish',
  praise:         'Rag\u2018batlantirish',
  detention:      'Qolib ishlash',
  parent_call:    "Ota-onaga qo'ng'iroq",
  parent_meeting: "Ota-ona yig'ilishi",
  suspension:     'Maktabdan chetlatish',
  other:          'Boshqa',
};

const EMPTY_FORM = {
  studentId: '',
  type: 'behavior' as DisciplineType,
  severity: 'low' as DisciplineSeverity,
  action: 'warning' as DisciplineAction,
  description: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

const LIMIT = 50;

export function DisciplineWorkspace() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const ask = useConfirm();

  const canManage = ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'].includes(user?.role ?? '');
  const isDirector = user?.role === 'director';
  const isVP = user?.role === 'vice_principal';
  const canDeleteAll = isDirector || isVP;

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterClass, setFilterClass] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);


  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: disciplineData, isLoading } = useQuery({
    queryKey: ['discipline', page, filterClass, filterSeverity, filterStatus, filterType],
    queryFn: () => disciplineApi.getAll({
      classId: filterClass || undefined,
      page,
      limit: LIMIT,
    }),
    retry: 1,
  });

  const { data: statsData } = useQuery({
    queryKey: ['discipline', 'stats'],
    queryFn: disciplineApi.getStats,
    staleTime: 60_000,
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
    enabled: canManage,
  });

  const incidents: DisciplineIncident[] = disciplineData?.data ?? [];
  const meta = disciplineData?.meta;
  const classes: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const stats = statsData;

  // Apply frontend filters
  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const studentName = i.student ? `${i.student.firstName} ${i.student.lastName}`.toLowerCase() : '';
        const reporterName = i.reportedBy ? `${i.reportedBy.firstName} ${i.reportedBy.lastName}`.toLowerCase() : '';
        const desc = i.description?.toLowerCase() ?? '';
        if (!studentName.includes(q) && !reporterName.includes(q) && !desc.includes(q)) return false;
      }
      if (filterSeverity && i.severity !== filterSeverity) return false;
      if (filterStatus === 'resolved' && !i.resolved) return false;
      if (filterStatus === 'open' && i.resolved) return false;
      if (filterType && i.type !== filterType) return false;
      return true;
    });
  }, [incidents, debouncedSearch, filterSeverity, filterStatus, filterType]);

  // ── Selection + Panel ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelIncident, setPanelIncident] = useState<DisciplineIncident | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === filteredIncidents.length && filteredIncidents.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIncidents.map((i) => i.id));
    }
  }, [selectedIds.length, filteredIncidents]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Create modal ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filterClassForModal, setFilterClassForModal] = useState('');

  const { data: classStudentsData } = useQuery({
    queryKey: ['class-students', filterClassForModal],
    queryFn: () => classesApi.getStudents(filterClassForModal),
    enabled: !!filterClassForModal,
  });
  const modalStudents: any[] = Array.isArray(classStudentsData) ? classStudentsData : [];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setFilterClassForModal('');
    setModalOpen(true);
  };

  const closeDialog = () => { setModalOpen(false); setForm(EMPTY_FORM); setErrors({}); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.studentId) e.studentId = "O'quvchi tanlang";
    if (!form.description.trim()) e.description = 'Tavsif kiriting';
    if (!form.date) e.date = 'Sana kiriting';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: disciplineApi.create,
    onSuccess: () => {
      toast({ title: 'Hodisa qayd etildi' });
      queryClient.invalidateQueries({ queryKey: ['discipline'] });
      closeDialog();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      studentId: form.studentId,
      type: form.type,
      severity: form.severity,
      action: form.action,
      description: form.description,
      date: form.date,
      notes: form.notes || undefined,
    });
  };

  // ── Resolve mutation ───────────────────────────────────────────────────────
  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => disciplineApi.resolve(id, notes),
    onSuccess: () => {
      toast({ title: 'Hodisa yechildi' });
      queryClient.invalidateQueries({ queryKey: ['discipline'] });
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: disciplineApi.remove,
    onSuccess: () => {
      toast({ title: "Hodisa o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['discipline'] });
    },
  });

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterClass) {
      const c = classes.find((x) => x.id === filterClass);
      chips.push({ key: 'class', label: c?.name ?? 'Sinf', onClear: () => setFilterClass('') });
    }
    if (filterSeverity) {
      const cfg = SEVERITY_CONFIG[filterSeverity as DisciplineSeverity];
      chips.push({ key: 'severity', label: cfg?.label ?? filterSeverity, onClear: () => setFilterSeverity('') });
    }
    if (filterStatus) {
      chips.push({ key: 'status', label: filterStatus === 'resolved' ? 'Yechilgan' : 'Ochiq', onClear: () => setFilterStatus('') });
    }
    if (filterType) {
      chips.push({ key: 'type', label: TYPE_LABELS[filterType as DisciplineType] ?? filterType, onClear: () => setFilterType('') });
    }
    return chips;
  }, [filterClass, filterSeverity, filterStatus, filterType, classes]);

  // ── Intelligence ───────────────────────────────────────────────────────────
  const totalIncidents = stats?.total ?? meta?.total ?? incidents.length;
  const unresolvedCount = stats?.unresolved ?? incidents.filter((i) => !i.resolved).length;
  const highSeverityCount = stats?.bySeverity?.find((s) => s.severity === 'high')?.count ?? incidents.filter((i) => i.severity === 'high').length;

  // Repeated incidents (student with 2+ incidents)
  const repeatedIncidents = useMemo(() => {
    const map = new Map<string, { student: any; count: number }>();
    incidents.forEach((i) => {
      if (!i.student) return;
      const cur = map.get(i.studentId) ?? { student: i.student, count: 0 };
      cur.count++;
      map.set(i.studentId, cur);
    });
    return Array.from(map.values()).filter((x) => x.count >= 2).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [incidents]);

  // Recent high severity
  const recentHighSeverity = useMemo(() => {
    return incidents.filter((i) => i.severity === 'high' && !i.resolved).slice(0, 5);
  }, [incidents]);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'student',
      header: "O'quvchi",
      cell: (i: DisciplineIncident) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center shrink-0 text-2xs font-bold text-xedu-slate-500">
            {i.student?.firstName?.[0]}{i.student?.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 text-xs truncate">
              {i.student ? `${i.student.firstName} ${i.student.lastName}` : "Noma'lum"}
            </p>
            <p className="text-2xs text-xedu-slate-400">{i.student?.class?.name ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tur',
      width: '100px',
      cell: (i: DisciplineIncident) => (
        <span className="text-xs font-medium text-xedu-slate-600">{TYPE_LABELS[i.type] ?? i.type}</span>
      ),
    },
    {
      key: 'severity',
      header: 'Daraja',
      width: '80px',
      cell: (i: DisciplineIncident) => {
        const cfg = SEVERITY_CONFIG[i.severity] ?? SEVERITY_CONFIG.low;
        return (
          <span className={cn('inline-flex items-center gap-1 text-2xs font-bold px-1.5 py-0.5 rounded border', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: 'Chora',
      width: '110px',
      cell: (i: DisciplineIncident) => (
        <span className="text-xs text-xedu-slate-500">{ACTION_LABELS[i.action] ?? i.action}</span>
      ),
    },
    {
      key: 'date',
      header: 'Sana',
      width: '80px',
      cell: (i: DisciplineIncident) => (
        <span className="text-xs text-xedu-slate-500">{formatDate(i.date)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      width: '80px',
      cell: (i: DisciplineIncident) => (
        <span className={cn(
          'inline-flex items-center gap-1 text-2xs font-bold',
          i.resolved ? 'text-xedu-primary' : 'text-xedu-slate-500'
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', i.resolved ? 'bg-xedu-primary' : 'bg-xedu-amber-400')} />
          {i.resolved ? 'Yechilgan' : 'Ochiq'}
        </span>
      ),
    },
    {
      key: 'reporter',
      header: 'Xabar bergan',
      width: '100px',
      cell: (i: DisciplineIncident) => (
        <span className="text-2xs text-xedu-slate-400 truncate">
          {i.reportedBy ? `${i.reportedBy.firstName} ${i.reportedBy.lastName}` : '—'}
        </span>
      ),
    },
  ], []);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="Intizom jurnali"
          subtitle={`${totalIncidents} ta hodisa · O'quvchi qo'llab-quvvatlash`}
          icon={<HeartHandshake className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            canManage && (
              <ActionBar
                primary={
                  <PrimaryAction onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                    Hodisa qo&apos;shish
                  </PrimaryAction>
                }
              />
            )
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
              placeholder="Ism, reporter, tavsif..."
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

          {activeFilters.length > 0 && (
            <button
              onClick={() => { setFilterClass(''); setFilterSeverity(''); setFilterStatus(''); setFilterType(''); }}
              className="text-xs font-semibold text-xedu-slate-400 hover:text-xedu-ruby-500 transition-colors"
            >
              Tozalash
            </button>
          )}
        </WorkspaceToolbar>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pb-2">
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha sinflar</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha darajalar</option>
              {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha holatlar</option>
              <option value="open">Ochiq</option>
              <option value="resolved">Yechilgan</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha turlar</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main: Incidents table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={filteredIncidents}
          rowKey={(i) => i.id}
          density="compact"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          rowTone={(i) => {
            if (i.severity === 'high' && !i.resolved) return 'urgent';
            if (i.severity === 'medium' && !i.resolved) return 'attention';
            if (i.resolved) return 'muted';
            return 'neutral';
          }}
          rowActions={(i) => (
            <>
              <IconAction
                icon={<Eye className="h-3.5 w-3.5" />}
                title="Ko'rish"
                onClick={() => setPanelIncident(i)}
                tone="primary"
              />
              {canManage && !i.resolved && (
                <IconAction
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  title="Yechish"
                  onClick={() => resolveMutation.mutate({ id: i.id })}
                  tone="primary"
                />
              )}
              <IconAction
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                title="Xabar"
                onClick={() => { window.location.href = `/dashboard/messages?userId=${i.studentId}`; }}
              />
              {canManage && (
                <IconAction
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  title="O'chirish"
                  tone="danger"
                  onClick={async () => { if (await ask({ title: "Hodisani o'chirishni tasdiqlang", description: "Hodisa o'chiriladi. Bu amal qaytarib bo'lmaydi.", variant: 'destructive', confirmText: "O'chirish" })) deleteMutation.mutate(i.id); }}
                />
              )}
            </>
          )}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CheckCircle2 className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">Hodisalar yo'q</p>
              <p className="text-xs text-xedu-slate-400">Barcha o'quvchilar intizomda</p>
            </div>
          }
        />

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-7 px-2 rounded-lg border border-xedu-slate-200 text-xs font-semibold text-xedu-slate-600 hover:bg-xedu-slate-50 disabled:opacity-40"
            >
              Oldingi
            </button>
            <span className="text-xs font-bold text-xedu-slate-700">
              {page} / {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="h-7 px-2 rounded-lg border border-xedu-slate-200 text-xs font-semibold text-xedu-slate-600 hover:bg-xedu-slate-50 disabled:opacity-40"
            >
              Keyingi
            </button>
          </div>
        )}
      </WorkspaceMain>

      {/* Right sidebar: Discipline intelligence */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Umumiy ko'rsatkichlar" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={totalIncidents} />
            <StatPill label="Bu oy" value={stats?.thisMonth ?? 0} />
            <StatPill label="Yechilmagan" value={unresolvedCount} tone={unresolvedCount > 0 ? 'attention' : 'success'} />
            <StatPill label="Yuqori daraja" value={highSeverityCount} tone={highSeverityCount > 0 ? 'urgent' : 'calm'} />
          </div>
        </WorkspaceSection>

        {stats?.bySeverity && stats.bySeverity.length > 0 && (
          <WorkspaceSection title="Daraja bo'yicha" icon={<AlertTriangle className="h-4 w-4" />}>
            <div className="space-y-1">
              {stats.bySeverity.map((s) => {
                const cfg = SEVERITY_CONFIG[s.severity];
                return (
                  <div key={s.severity} className="flex items-center justify-between rounded-md px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                      <span className="text-xs font-medium text-xedu-slate-600">{cfg.label}</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-xedu-slate-700">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </WorkspaceSection>
        )}

        {stats?.byType && stats.byType.length > 0 && (
          <WorkspaceSection title="Tur bo'yicha" icon={<FileText className="h-4 w-4" />}>
            <div className="space-y-1">
              {stats.byType.map((t) => (
                <div key={t.type} className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium text-xedu-slate-600">{TYPE_LABELS[t.type as DisciplineType] ?? t.type}</span>
                  <span className="text-xs font-bold tabular-nums text-xedu-slate-700">{t.count}</span>
                </div>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {/* Repeated incidents */}
        {repeatedIncidents.length > 0 && (
          <WorkspaceSection title="Takroriy hodisalar" icon={<AlertTriangle className="h-4 w-4 text-xedu-amber-500" />}>
            <div className="space-y-1">
              {repeatedIncidents.map((r) => (
                <Link
                  key={r.student.id}
                  href={`/dashboard/users/${r.student.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <span className="text-xs font-medium text-xedu-slate-700 truncate">{r.student.firstName} {r.student.lastName}</span>
                  <span className="text-2xs font-bold text-xedu-amber-600 shrink-0">{r.count} ta</span>
                </Link>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {/* Recent high severity */}
        {recentHighSeverity.length > 0 && (
          <WorkspaceSection title="Jiddiy hodisalar" icon={<ShieldAlert className="h-4 w-4 text-xedu-ruby-500" />}>
            <div className="space-y-1">
              {recentHighSeverity.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setPanelIncident(i)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-xedu-ruby-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">
                      {i.student ? `${i.student.firstName} ${i.student.lastName}` : "Noma'lum"}
                    </p>
                    <p className="text-2xs text-xedu-slate-400">{TYPE_LABELS[i.type] ?? i.type} · {formatDate(i.date)}</p>
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/attendance" icon={ClipboardCheck} label="Davomat" />
            <QuickLink href="/dashboard/students" icon={Users} label="O'quvchilar" />
            <QuickLink href="/dashboard/classes" icon={School} label="Sinflar" />
            <QuickLink href="/dashboard/reports" icon={BarChart3} label="Hisobotlar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Incident Entity Panel */}
      <IncidentPanel
        incident={panelIncident}
        open={!!panelIncident}
        onClose={() => setPanelIncident(null)}
        onResolve={canManage ? (id) => resolveMutation.mutate({ id }) : undefined}
      />

      {/* Bulk toolbar */}
      <FloatingBulkToolbar
        visible={selectedIds.length >= 1 && canManage}
        selectedIds={selectedIds}
        actions={[
          {
            id: 'resolve',
            label: 'Yechish',
            icon: CheckCircle2,
            tone: 'primary',
            onClick: (ids: string[]) => {
              ids.forEach((id) => resolveMutation.mutate({ id }));
              clearSelection();
            },
          },
          {
            id: 'export',
            label: 'Export',
            icon: ArrowRight,
            tone: 'neutral',
            onClick: () => toast({ title: `${selectedIds.length} ta hodisa export qilindi` }),
          },
        ]}
        onClear={clearSelection}
      />

      {/* Create Incident Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-xedu-slate-500" /> Hodisa qayd etish
            </DialogTitle>
            <DialogDescription>O&apos;quvchiga oid intizom hodisasini tizimga kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Class + Student */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf</Label>
                <Select value={filterClassForModal} onValueChange={(v) => { setFilterClassForModal(v); setForm((f) => ({ ...f, studentId: '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Sinf tanlang..." /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>O&apos;quvchi <span className="text-xedu-ruby">*</span></Label>
                <Select value={form.studentId} onValueChange={(v) => { setForm((f) => ({ ...f, studentId: v })); setErrors((e) => { const n = { ...e }; delete n.studentId; return n; }); }}>
                  <SelectTrigger><SelectValue placeholder="O'quvchi..." /></SelectTrigger>
                  <SelectContent>
                    {modalStudents.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.studentId && <p className="text-xs text-xedu-ruby">{errors.studentId}</p>}
              </div>
            </div>

            {/* Type + Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hodisa turi</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as DisciplineType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Darajasi</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v as DisciplineSeverity }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ko&apos;rilgan chora</Label>
                <Select value={form.action} onValueChange={(v) => setForm((f) => ({ ...f, action: v as DisciplineAction }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sana <span className="text-xedu-ruby">*</span></Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                {errors.date && <p className="text-xs text-xedu-ruby">{errors.date}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Tavsif <span className="text-xedu-ruby">*</span></Label>
              <Textarea
                placeholder="Nima bo'ldi? Batafsil yozing..."
                value={form.description}
                onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setErrors((e2) => { const n = { ...e2 }; delete n.description; return n; }); }}
                rows={3}
              />
              {errors.description && <p className="text-xs text-xedu-ruby">{errors.description}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Qo&apos;shimcha izoh</Label>
              <Input placeholder="Ixtiyoriy..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <SecondaryAction onClick={closeDialog}>Bekor</SecondaryAction>
            <PrimaryAction onClick={handleSubmit} loading={createMutation.isPending}>
              Saqlash
            </PrimaryAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────



// ── Incident Entity Panel ──────────────────────────────────────────────────────

function IncidentPanel({
  incident,
  open,
  onClose,
  onResolve,
}: {
  incident: DisciplineIncident | null;
  open: boolean;
  onClose: () => void;
  onResolve?: (id: string) => void;
}) {
  if (!incident) return null;

  const sevCfg = SEVERITY_CONFIG[incident.severity] ?? SEVERITY_CONFIG.low;

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-base font-bold text-xedu-slate-500">
              {incident.student?.firstName?.[0]}{incident.student?.lastName?.[0]}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
                {incident.student ? `${incident.student.firstName} ${incident.student.lastName}` : "Noma'lum"}
              </p>
              <p className="text-xs text-xedu-slate-500">{incident.student?.class?.name ?? '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={FileText} label="Tur" value={TYPE_LABELS[incident.type] ?? incident.type} />
            <InfoItem icon={AlertTriangle} label="Daraja" value={sevCfg.label} />
            <InfoItem icon={UserCheck} label="Chora" value={ACTION_LABELS[incident.action] ?? incident.action} />
            <InfoItem icon={Calendar} label="Sana" value={formatDate(incident.date)} />
          </div>

          <div>
            <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1">Tavsif</p>
            <p className="text-xs text-xedu-slate-700 bg-xedu-slate-50 dark:bg-xedu-slate-800 rounded-md px-2.5 py-2">
              {incident.description}
            </p>
          </div>

          {incident.notes && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1">Izoh</p>
              <p className="text-xs text-xedu-slate-700 bg-xedu-slate-50 dark:bg-xedu-slate-800 rounded-md px-2.5 py-2">
                {incident.notes}
              </p>
            </div>
          )}

          {incident.resolved && incident.resolvedAt && (
            <div className="flex items-start gap-2 rounded-md border border-xedu-primary-light bg-xedu-primary-light/30 px-2.5 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-xedu-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-xedu-slate-700">Hodisa yechildi</p>
                <p className="text-2xs text-xedu-slate-400">{formatDate(incident.resolvedAt)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {onResolve && !incident.resolved && (
              <PrimaryAction icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onResolve(incident.id)}>
                Yechilgan deb belgilash
              </PrimaryAction>
            )}
            <SecondaryAction icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/messages?userId=${incident.studentId}`; }}>
              Xabar
            </SecondaryAction>
            {incident.student?.id && (
              <SecondaryAction icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/users/${incident.student?.id}`; }}>
                Profil
              </SecondaryAction>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'student',
      label: "O'quvchi",
      content: (
        <div className="p-5">
          {incident.student ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-xedu-slate-100 flex items-center justify-center text-sm font-bold text-xedu-slate-500">
                  {getInitials(incident.student.firstName, incident.student.lastName)}
                </div>
                <div>
                  <p className="text-sm font-bold">{incident.student.firstName} {incident.student.lastName}</p>
                  <p className="text-xs text-xedu-slate-500">{incident.student.class?.name ?? '—'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryAction onClick={() => { window.location.href = `/dashboard/users/${incident.student?.id}`; }}>
                  Profil
                </SecondaryAction>
                <SecondaryAction onClick={() => { window.location.href = `/dashboard/messages?userId=${incident.student?.id}`; }}>
                  Xabar
                </SecondaryAction>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <Users className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">O'quvchi ma'lumotlari mavjud emas</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'reporter',
      label: 'Xabar bergan',
      content: (
        <div className="p-5">
          {incident.reportedBy ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-xedu-slate-100 flex items-center justify-center text-sm font-bold text-xedu-slate-500">
                {getInitials(incident.reportedBy.firstName, incident.reportedBy.lastName)}
              </div>
              <div>
                <p className="text-sm font-bold">{incident.reportedBy.firstName} {incident.reportedBy.lastName}</p>
                <p className="text-xs text-xedu-slate-500">Xodim</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <UserCheck className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Ma'lumot yo'q</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'activity',
      label: 'Faoliyat',
      content: (
        <div className="p-5">
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-xedu-slate-100 px-2.5 py-2">
              <Clock className="h-3.5 w-3.5 text-xedu-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-xedu-slate-700">Yaratildi</p>
                <p className="text-2xs text-xedu-slate-400">{incident.createdAt ? formatDate(incident.createdAt) : '—'}</p>
              </div>
            </div>
            {incident.resolvedAt && (
              <div className="flex items-start gap-2 rounded-md border border-xedu-primary-light px-2.5 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-xedu-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-xedu-slate-700">Yechilgan</p>
                  <p className="text-2xs text-xedu-slate-400">{formatDate(incident.resolvedAt)}</p>
                </div>
              </div>
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
      entityType="discipline"
      title={TYPE_LABELS[incident.type] ?? incident.type}
      subtitle={incident.student ? `${incident.student.firstName} ${incident.student.lastName}` : "Noma'lum"}
      status={incident.resolved ? 'resolved' : incident.severity === 'high' ? 'overdue' : 'open'}
      metrics={[
        { label: 'Daraja', value: sevCfg.label, tone: incident.severity === 'high' ? 'urgent' : incident.severity === 'medium' ? 'attention' : 'calm' },
        { label: 'Chora', value: ACTION_LABELS[incident.action] ?? '—', tone: 'calm' },
        { label: 'Holat', value: incident.resolved ? 'Yechilgan' : 'Ochiq', tone: incident.resolved ? 'success' : 'attention' },
      ]}
      tabs={tabs}
    />
  );
}

