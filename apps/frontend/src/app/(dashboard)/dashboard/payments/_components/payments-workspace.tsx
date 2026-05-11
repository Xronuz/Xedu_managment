'use client';

import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@/components/workspace-system/use-debounced-value';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Search, Wallet, Clock, AlertTriangle, CheckCircle2,
  XCircle, ArrowRight, Eye, Send, Plus, Filter, X, Calendar,
  TrendingUp, Users, School, Banknote, FileText, ChevronRight,
  Loader2, MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { paymentsApi } from '@/lib/api/payments';
import { financeApi } from '@/lib/api/finance';
import { feeStructuresApi } from '@/lib/api/fee-structures';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';

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
   PAYMENTS / FINANCE WORKSPACE
   Institutional financial operations workspace.
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; badge: string }> = {
  paid:     { label: "To'landi",         dot: 'bg-xedu-primary',      text: 'text-xedu-primary',      badge: 'border-xedu-primary bg-xedu-primary-light text-xedu-primary' },
  pending:  { label: 'Kutilmoqda',       dot: 'bg-xedu-amber-500',         text: 'text-xedu-amber-600',         badge: 'border-xedu-amber-200 bg-xedu-amber-50 text-xedu-amber-600' },
  overdue:  { label: "Muddati o'tgan",   dot: 'bg-xedu-ruby-500',           text: 'text-xedu-ruby-600',           badge: 'border-xedu-ruby-200 bg-xedu-ruby-50 text-xedu-ruby-600' },
  failed:   { label: 'Muvaffaqiyatsiz',  dot: 'bg-xedu-ruby-400',           text: 'text-xedu-ruby-500',           badge: 'border-xedu-ruby-100 bg-xedu-ruby-50 text-xedu-ruby-500' },
  refunded: { label: 'Qaytarildi',       dot: 'bg-xedu-slate-400',    text: 'text-xedu-slate-500',    badge: 'border-xedu-slate-200 bg-xedu-slate-50 text-xedu-slate-500' },
};

const PROVIDER_LABELS: Record<string, string> = {
  cash: 'Naqd',
  payme: 'Payme',
  click: 'Click',
  transfer: "O'tkazma",
};

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider?: string;
  description?: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  student?: { id: string; firstName: string; lastName: string; phone?: string; class?: { name: string } } | null;
  studentId?: string;
  branch?: { id: string; name: string } | null;
  classId?: string | null;
}

const CREATE_EMPTY = {
  studentId: '',
  amount: '',
  description: '',
  dueDate: '',
  currency: 'UZS',
};

export function PaymentsWorkspace() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const isDirector = user?.role === 'director';
  const isAccountant = user?.role === 'accountant';
  const isBranchAdmin = user?.role === 'branch_admin';
  const canManage = isDirector || isAccountant || isBranchAdmin;
  const canCreate = isAccountant || isBranchAdmin;

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);


  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['payments', 'history', filterClass, filterStatus, filterFrom, filterTo, debouncedSearch],
    queryFn: () => paymentsApi.getHistory({
      classId: filterClass || undefined,
      status: filterStatus || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      limit: 200,
    }),
  });

  const { data: reportData } = useQuery({
    queryKey: ['payments', 'report'],
    queryFn: paymentsApi.getReport,
  });

  const { data: financeStats } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: financeApi.getDashboard,
    staleTime: 60_000,
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-for-payment-create'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 200 }),
    enabled: false,
  });

  const payments: PaymentRow[] = useMemo(() => {
    const arr = (historyData as any)?.data ?? (Array.isArray(historyData) ? historyData : []);
    if (!debouncedSearch) return arr;
    const q = debouncedSearch.toLowerCase();
    return arr.filter((p: PaymentRow) => {
      const studentName = p.student ? `${p.student.firstName} ${p.student.lastName}`.toLowerCase() : '';
      const phone = p.student?.phone?.toLowerCase() ?? '';
      const desc = p.description?.toLowerCase() ?? '';
      return studentName.includes(q) || phone.includes(q) || desc.includes(q);
    });
  }, [historyData, debouncedSearch]);

  const classes: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const allStudents = useMemo(() => {
    const arr = (studentsData as any)?.data ?? [];
    return arr.filter((u: any) => u.role === 'student');
  }, [studentsData]);

  // ── Selection + Panel ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelPayment, setPanelPayment] = useState<PaymentRow | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === payments.length && payments.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payments.map((p) => p.id));
    }
  }, [selectedIds.length, payments]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Create modal ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(CREATE_EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setForm(CREATE_EMPTY);
    setErrors({});
    setModalOpen(true);
    queryClient.prefetchQuery({
      queryKey: ['students-for-payment-create'],
      queryFn: () => usersApi.getAll({ page: 1, limit: 200 }),
    });
  };

  const closeDialog = () => { setModalOpen(false); setForm(CREATE_EMPTY); setErrors({}); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.studentId) e.studentId = "O'quvchi tanlang";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = "To'lov summasi kiriting";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      toast({ title: "To'lov qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      closeDialog();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleCreate = () => {
    if (!validate()) return;
    createMutation.mutate({
      studentId: form.studentId,
      amount: Number(form.amount),
      description: form.description || undefined,
      dueDate: form.dueDate || undefined,
      currency: form.currency,
    });
  };

  // ── Mark as paid (with optimistic update) ──────────────────────────────────
  const markPaidMutation = useMutation({
    mutationFn: paymentsApi.markAsPaid,
    onMutate: async (paymentId: string) => {
      await queryClient.cancelQueries({ queryKey: ['payments'] });
      const snapshot = queryClient.getQueryData(['payments', 'history']);

      queryClient.setQueryData(['payments', 'history'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((p: any) =>
            p.id === paymentId ? { ...p, status: 'paid', paidAt: new Date().toISOString() } : p
          ),
        };
      });

      return { snapshot };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast({ title: "To'lov to'landi deb belgilandi" });
    },
    onError: (err: any, _id, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(['payments', 'history'], context.snapshot);
      }
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message });
    },
  });

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterStatus) {
      const cfg = STATUS_CONFIG[filterStatus];
      chips.push({ key: 'status', label: cfg?.label ?? filterStatus, onClear: () => setFilterStatus('') });
    }
    if (filterClass) {
      const c = classes.find((x) => x.id === filterClass);
      chips.push({ key: 'class', label: c?.name ?? 'Sinf', onClear: () => setFilterClass('') });
    }
    if (filterFrom) {
      chips.push({ key: 'from', label: `Dan: ${filterFrom}`, onClear: () => setFilterFrom('') });
    }
    if (filterTo) {
      chips.push({ key: 'to', label: `Gacha: ${filterTo}`, onClear: () => setFilterTo('') });
    }
    return chips;
  }, [filterStatus, filterClass, filterFrom, filterTo, classes]);

  // ── Finance intelligence ───────────────────────────────────────────────────
  const stats = financeStats;
  const totalCollected = stats?.thisMonthRevenue ?? 0;
  const outstanding = (stats?.pendingAmount ?? 0) + (stats?.overdueAmount ?? 0);
  const overdueCount = stats?.overdueCount ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;

  const report: any = reportData ?? {};
  const classStats: any[] = report?.classStats ?? [];
  const totalDebtors = classStats.reduce((s: number, c: any) => s + (c.debtorCount ?? 0), 0);
  const totalDebt = classStats.reduce((s: number, c: any) => s + (c.totalDebt ?? 0), 0);

  const methodBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    payments.forEach((p) => {
      const key = p.provider ?? 'cash';
      const cur = map.get(key) ?? { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += p.amount;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].amount - a[1].amount);
  }, [payments]);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'student',
      header: "To'lovchi",
      cell: (p: PaymentRow) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center shrink-0 text-2xs font-bold text-xedu-slate-500">
            {p.student?.firstName?.[0]}{p.student?.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 text-xs truncate">
              {p.student ? `${p.student.firstName} ${p.student.lastName}` : "Noma'lum"}
            </p>
            <p className="text-2xs text-xedu-slate-400 truncate">
              {p.student?.class?.name ?? p.student?.phone ?? '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Summa',
      width: '120px',
      cell: (p: PaymentRow) => (
        <div className="text-right">
          <p className="text-xs font-bold tabular-nums text-xedu-slate-900 dark:text-xedu-slate-100">
            {formatCurrency(p.amount)}
          </p>
          <p className="text-2xs text-xedu-slate-400">{p.currency ?? 'UZS'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      width: '100px',
      cell: (p: PaymentRow) => {
        const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
        return (
          <span className={cn('inline-flex items-center gap-1 text-2xs font-bold px-1.5 py-0.5 rounded border', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'method',
      header: 'Usul',
      width: '80px',
      cell: (p: PaymentRow) => (
        <span className="text-xs text-xedu-slate-500">
          {PROVIDER_LABELS[p.provider ?? 'cash'] ?? p.provider ?? 'Naqd'}
        </span>
      ),
    },
    {
      key: 'due',
      header: 'Muddat',
      width: '90px',
      cell: (p: PaymentRow) => {
        const isOverdue = p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'paid';
        return (
          <span className={cn('text-xs', isOverdue ? 'text-xedu-ruby-500 font-bold' : 'text-xedu-slate-500')}>
            {p.dueDate ? formatDate(p.dueDate) : '—'}
          </span>
        );
      },
    },
    {
      key: 'paid',
      header: "To'lov sanasi",
      width: '90px',
      cell: (p: PaymentRow) => (
        <span className="text-xs text-xedu-slate-500">
          {p.paidAt ? formatDate(p.paidAt) : p.createdAt ? formatDate(p.createdAt) : '—'}
        </span>
      ),
    },
  ], []);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="To'lovlar"
          subtitle={`${payments.length} ta yozuv · Moliyaviy operatsiyalar`}
          icon={<Wallet className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            canCreate && (
              <ActionBar
                primary={
                  <PrimaryAction onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                    To'lov qo'shish
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
              placeholder="Ism, telefon, izoh..."
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
              onClick={() => { setFilterStatus(''); setFilterClass(''); setFilterFrom(''); setFilterTo(''); }}
              className="text-xs font-semibold text-xedu-slate-400 hover:text-xedu-ruby-500 transition-colors"
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
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha holatlar</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha sinflar</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <Label className="text-2xs text-xedu-slate-400">Dan</Label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-2xs text-xedu-slate-400">Gacha</Label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main: Payments table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={payments}
          rowKey={(p) => p.id}
          density="compact"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          rowTone={(p) => {
            if (p.status === 'overdue') return 'urgent';
            if (p.status === 'pending') return 'attention';
            if (p.status === 'failed') return 'urgent';
            if (p.status === 'paid') return 'success';
            return 'neutral';
          }}
          rowActions={(p) => (
            <>
              <IconAction
                icon={<Eye className="h-3.5 w-3.5" />}
                title="Ko'rish"
                onClick={() => setPanelPayment(p)}
                tone="primary"
              />
              {canManage && p.status !== 'paid' && (
                <IconAction
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  title="To'landi"
                  onClick={() => markPaidMutation.mutate(p.id)}
                  tone="primary"
                />
              )}
              <IconAction
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                title="Eslatma"
                onClick={() => { window.location.href = `/dashboard/messages?userId=${p.studentId}`; }}
              />
            </>
          )}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CreditCard className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">To'lovlar topilmadi</p>
              <p className="text-xs text-xedu-slate-400">Filterlarni yoki qidiruvni o&apos;zgartirib ko&apos;ring</p>
            </div>
          }
        />
      </WorkspaceMain>

      {/* Right sidebar: Finance intelligence */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Moliyaviy ko'rsatkichlar" icon={<TrendingUp className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Bu oy" value={formatCurrency(totalCollected)} />
            <StatPill label="Jami" value={formatCurrency(totalRevenue)} />
            <StatPill label="Kutilmoqda" value={stats?.pendingAmount ?? 0} tone="attention" />
            <StatPill label="Muddati o'tgan" value={stats?.overdueAmount ?? 0} tone="urgent" />
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="Qarzdorlar" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Qarzdorlar" value={totalDebtors} tone={totalDebtors > 0 ? 'urgent' : 'success'} />
            <StatPill label="Qarz jami" value={formatCurrency(totalDebt)} tone={totalDebt > 0 ? 'urgent' : 'success'} />
            <StatPill label="Kutilmoqda" value={pendingCount} tone="attention" />
            <StatPill label="Muddati o'tgan" value={overdueCount} tone="urgent" />
          </div>
        </WorkspaceSection>

        {methodBreakdown.length > 0 && (
          <WorkspaceSection title="To'lov usullari" icon={<Banknote className="h-4 w-4" />}>
            <div className="space-y-1">
              {methodBreakdown.map(([method, data]) => (
                <div key={method} className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium text-xedu-slate-600">
                    {PROVIDER_LABELS[method] ?? method}
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-bold tabular-nums text-xedu-slate-700">
                      {formatCurrency(data.amount)}
                    </span>
                    <span className="text-2xs text-xedu-slate-400 ml-1">({data.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {/* Class debtor summary */}
        {classStats.length > 0 && (
          <WorkspaceSection title="Sinf bo'yicha qarz" icon={<School className="h-4 w-4" />}>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {classStats
                .filter((c: any) => (c.debtorCount ?? 0) > 0)
                .sort((a: any, b: any) => (b.totalDebt ?? 0) - (a.totalDebt ?? 0))
                .slice(0, 8)
                .map((c: any) => (
                  <div key={c.classId} className="flex items-center justify-between rounded-md px-2 py-1.5">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-xedu-slate-700 truncate">{c.className}</span>
                      <span className="text-2xs text-xedu-slate-400 ml-1">{c.debtorCount} ta</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-xedu-ruby-600">
                      {formatCurrency(c.totalDebt)}
                    </span>
                  </div>
                ))}
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/finance" icon={TrendingUp} label="Moliyaviy dashboard" />
            <QuickLink href="/dashboard/fee-structures" icon={FileText} label="To'lov tartiblari" />
            <QuickLink href="/dashboard/payroll" icon={Banknote} label="Maoshlar" />
            <QuickLink href="/dashboard/reports" icon={FileText} label="Hisobotlar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Payment Entity Panel */}
      <PaymentPanel
        payment={panelPayment}
        open={!!panelPayment}
        onClose={() => setPanelPayment(null)}
        onMarkPaid={canManage ? (id) => markPaidMutation.mutate(id) : undefined}
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
            onClick: () => toast({ title: `${selectedIds.length} ta to'lov export qilindi` }),
          },
          {
            id: 'remind',
            label: 'Eslatma yuborish',
            icon: Send,
            tone: 'primary',
            onClick: () => toast({ title: `${selectedIds.length} ta to'lovchi uchun eslatma` }),
          },
        ]}
        onClear={clearSelection}
      />

      {/* Create Payment Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi to'lov qo'shish</DialogTitle>
            <DialogDescription>O'quvchi uchun to'lov qayd eting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>O'quvchi <span className="text-xedu-ruby">*</span></Label>
              <Select value={form.studentId} onValueChange={(v) => { setForm((f) => ({ ...f, studentId: v })); setErrors((e) => { const n = { ...e }; delete n.studentId; return n; }); }}>
                <SelectTrigger>
                  <SelectValue placeholder="O'quvchi tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && <p className="text-xs text-xedu-ruby">{errors.studentId}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Summa (so'm) <span className="text-xedu-ruby">*</span></Label>
                <Input type="number" min={0} placeholder="500000" value={form.amount}
                  onChange={(e) => { setForm((f) => ({ ...f, amount: e.target.value })); setErrors((er) => { const n = { ...er }; delete n.amount; return n; }); }} />
                {errors.amount && <p className="text-xs text-xedu-ruby">{errors.amount}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Muddat</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Input placeholder="Oylik to'lov, may 2026..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <SecondaryAction onClick={closeDialog}>Bekor</SecondaryAction>
            <PrimaryAction onClick={handleCreate} loading={createMutation.isPending}>
              Saqlash
            </PrimaryAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────



// ── Payment Entity Panel ───────────────────────────────────────────────────────

function PaymentPanel({
  payment,
  open,
  onClose,
  onMarkPaid,
}: {
  payment: PaymentRow | null;
  open: boolean;
  onClose: () => void;
  onMarkPaid?: (id: string) => void;
}) {
  if (!payment) return null;

  const cfg = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending;
  const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date() && payment.status !== 'paid';

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-xedu-primary-light flex items-center justify-center text-lg font-bold text-xedu-primary">
              {payment.student?.firstName?.[0]}{payment.student?.lastName?.[0]}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
                {payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "Noma'lum"}
              </p>
              <p className="text-xs text-xedu-slate-500">
                {payment.student?.class?.name ?? payment.student?.phone ?? '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={Wallet} label="Summa" value={formatCurrency(payment.amount)} />
            <InfoItem icon={Banknote} label="Valyuta" value={payment.currency ?? 'UZS'} />
            <InfoItem icon={Calendar} label="Muddat" value={payment.dueDate ? formatDate(payment.dueDate) : '—'} />
            <InfoItem icon={CheckCircle2} label="Holat" value={cfg.label} />
          </div>

          {payment.description && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1">Izoh</p>
              <p className="text-xs text-xedu-slate-700 bg-xedu-slate-50 dark:bg-xedu-slate-800 rounded-md px-2.5 py-2">
                {payment.description}
              </p>
            </div>
          )}

          {isOverdue && (
            <div className="flex items-start gap-2 rounded-md border border-xedu-ruby-100 bg-xedu-ruby-50 px-2.5 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-xedu-ruby-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-xedu-ruby-700">
                To'lov muddati o'tgan. Eslatma yuborish tavsiya etiladi.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {onMarkPaid && payment.status !== 'paid' && (
              <PrimaryAction icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onMarkPaid(payment.id)}>
                To'landi deb belgilash
              </PrimaryAction>
            )}
            <SecondaryAction icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/messages?userId=${payment.studentId}`; }}>
              Xabar
            </SecondaryAction>
            {payment.student?.id && (
              <SecondaryAction icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/users/${payment.student?.id}`; }}>
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
          {payment.student ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-xedu-slate-100 flex items-center justify-center text-sm font-bold text-xedu-slate-500">
                  {payment.student.firstName[0]}{payment.student.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-bold">{payment.student.firstName} {payment.student.lastName}</p>
                  {payment.student.phone && <p className="text-xs text-xedu-slate-500">{payment.student.phone}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryAction onClick={() => { window.location.href = `/dashboard/users/${payment.student?.id}`; }}>
                  Profil
                </SecondaryAction>
                <SecondaryAction onClick={() => { window.location.href = `/dashboard/messages?userId=${payment.student?.id}`; }}>
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
      id: 'activity',
      label: 'Faoliyat',
      content: (
        <div className="p-5">
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-xedu-slate-100 px-2.5 py-2">
              <Clock className="h-3.5 w-3.5 text-xedu-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-xedu-slate-700">Yaratildi</p>
                <p className="text-2xs text-xedu-slate-400">{payment.createdAt ? formatDate(payment.createdAt) : '—'}</p>
              </div>
            </div>
            {payment.paidAt && (
              <div className="flex items-start gap-2 rounded-md border border-xedu-primary-light px-2.5 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-xedu-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-xedu-slate-700">To'landi</p>
                  <p className="text-2xs text-xedu-slate-400">{formatDate(payment.paidAt)}</p>
                </div>
              </div>
            )}
            {payment.dueDate && (
              <div className="flex items-start gap-2 rounded-md border border-xedu-slate-100 px-2.5 py-2">
                <Calendar className="h-3.5 w-3.5 text-xedu-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-xedu-slate-700">Muddat</p>
                  <p className="text-2xs text-xedu-slate-400">{formatDate(payment.dueDate)}</p>
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
      entityType="payment"
      title={formatCurrency(payment.amount)}
      subtitle={payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "Noma'lum"}
      status={payment.status === 'paid' ? 'paid' : isOverdue ? 'overdue' : payment.status === 'pending' ? 'pending' : 'open'}
      metrics={[
        { label: 'Summa', value: formatCurrency(payment.amount), tone: 'calm' },
        { label: 'Holat', value: cfg.label, tone: payment.status === 'paid' ? 'success' : isOverdue ? 'urgent' : 'attention' },
        { label: 'Usul', value: PROVIDER_LABELS[payment.provider ?? 'cash'] ?? 'Naqd', tone: 'calm' },
      ]}
      tabs={tabs}
    />
  );
}

