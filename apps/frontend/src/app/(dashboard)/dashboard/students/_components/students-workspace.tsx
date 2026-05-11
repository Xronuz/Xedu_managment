'use client';

import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@/components/workspace-system/use-debounced-value';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap, Search, Users, Phone, Mail, MapPin,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  MessageSquare, Wallet, ClipboardCheck, Eye, Send,
  Loader2, Filter, X, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { useConfirm } from '@/store/confirm.store';

import { usersApi } from '@/lib/api/users';
import { branchesApi } from '@/lib/api/branches';
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
   STUDENTS WORKSPACE
   Institutional student operations workspace.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  class?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  parent?: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export function StudentsWorkspace() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const ask = useConfirm();
  const isDirector = user?.role === 'director';
  const isBranchAdmin = user?.role === 'branch_admin';
  const canManage = isDirector || isBranchAdmin || user?.role === 'vice_principal';

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterClass, setFilterClass] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);


  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', debouncedSearch, filterClass, filterBranch, filterStatus],
    queryFn: () => usersApi.getAll({
      role: 'student',
      search: debouncedSearch || undefined,
      branchId: filterBranch || undefined,
      limit: 100,
    }),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.getAll(),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.getAll(),
  });

  const students: StudentRow[] = useMemo(() => {
    const list = (studentsData as any)?.data ?? [];
    return list.filter((s: any) => {
      if (filterClass && s.class?.id !== filterClass) return false;
      if (filterStatus === 'active' && !s.isActive) return false;
      if (filterStatus === 'inactive' && s.isActive) return false;
      return true;
    });
  }, [studentsData, filterClass, filterStatus]);

  const branches: any[] = (branchesData as any)?.data ?? (Array.isArray(branchesData) ? branchesData : []);
  const classList: any[] = (classesData as any)?.data ?? (Array.isArray(classesData) ? classesData : []);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelStudent, setPanelStudent] = useState<StudentRow | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === students.length && students.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  }, [selectedIds.length, students]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const blockMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({ title: "O'quvchi bloklandi" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => usersApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({ title: "O'quvchi faollashtirildi" });
    },
  });

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterClass) {
      const c = classList.find((x) => x.id === filterClass);
      chips.push({ key: 'class', label: c?.name ?? 'Sinf', onClear: () => setFilterClass('') });
    }
    if (filterBranch) {
      const b = branches.find((x) => x.id === filterBranch);
      chips.push({ key: 'branch', label: b?.name ?? 'Filial', onClear: () => setFilterBranch('') });
    }
    if (filterStatus) {
      chips.push({ key: 'status', label: filterStatus === 'active' ? 'Faol' : 'Nofaol', onClear: () => setFilterStatus('') });
    }
    return chips;
  }, [filterClass, filterBranch, filterStatus, classList, branches]);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'name',
      header: "O'quvchi",
      cell: (s: StudentRow) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center shrink-0 text-2xs font-bold text-xedu-slate-500">
            {s.firstName[0]}{s.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 truncate">
              {s.firstName} {s.lastName}
            </p>
            <p className="text-2xs text-xedu-slate-400 truncate">{s.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Sinf',
      width: '100px',
      cell: (s: StudentRow) => (
        <span className="text-xedu-slate-600 dark:text-xedu-slate-300">
          {s.class?.name ?? <span className="text-xedu-slate-300">—</span>}
        </span>
      ),
    },
    {
      key: 'branch',
      header: 'Filial',
      width: '120px',
      cell: (s: StudentRow) => (
        <span className="text-xedu-slate-500">
          {s.branch?.name ?? <span className="text-xedu-slate-300">—</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      width: '80px',
      cell: (s: StudentRow) => (
        <div className="flex items-center gap-1.5">
          <div className={cn('h-2 w-2 rounded-full', s.isActive ? 'bg-xedu-primary' : 'bg-xedu-ruby-400')} />
          <span className={cn('text-xs font-semibold', s.isActive ? 'text-xedu-primary' : 'text-xedu-ruby-500')}>
            {s.isActive ? 'Faol' : 'Nofaol'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      width: '120px',
      cell: (s: StudentRow) => (
        <span className="text-xedu-slate-500 text-xs">{s.phone ?? '—'}</span>
      ),
    },
    {
      key: 'parent',
      header: 'Ota-ona',
      width: '120px',
      cell: (s: StudentRow) => (
        s.parent ? (
          <span className="text-xs text-xedu-slate-500">
            {s.parent.firstName} {s.parent.lastName}
          </span>
        ) : (
          <span className="text-xedu-slate-300 text-xs">—</span>
        )
      ),
    },
  ], []);

  const totalCount = (studentsData as any)?.meta?.total ?? students.length;

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="O'quvchilar"
          subtitle={`${totalCount} ta o'quvchi · Maktab umumiy ro'yxati`}
          icon={<GraduationCap className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            canManage && (
              <ActionBar
                primary={
                  <PrimaryAction
                    onClick={() => {
                      /* Navigate to add student - reuse users page logic or modal */
                      window.location.href = '/dashboard/users';
                    }}
                  >
                    + O'quvchi qo'shish
                  </PrimaryAction>
                }
                secondary={
                  <SecondaryAction onClick={() => {}}>
                    <Filter className="h-3.5 w-3.5" />
                    Import
                  </SecondaryAction>
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
              placeholder="Ism, familiya, email, telefon..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-800 dark:text-xedu-slate-200 outline-none focus:ring-1 focus:ring-xedu-primary"
            />
            {search && (
              <button onClick={() => { setSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-xedu-slate-400" />
              </button>
            )}
          </div>

          {/* Filter toggles */}
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
              onClick={() => { setFilterClass(''); setFilterBranch(''); setFilterStatus(''); }}
              className="text-xs font-semibold text-xedu-slate-400 hover:text-xedu-ruby-500 transition-colors"
            >
              Tozalash
            </button>
          )}
        </WorkspaceToolbar>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pb-2">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha sinflar</option>
              {classList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha filiallar</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha holatlar</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>
        )}
      </div>

      {/* Main: Student table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={students}
          rowKey={(s) => s.id}
          density="compact"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          rowTone={(s) => !s.isActive ? 'muted' : 'neutral'}
          rowHref={(s) => `/dashboard/users/${s.id}`}
          rowActions={(s) => (
            <>
              <IconAction
                icon={<Eye className="h-3.5 w-3.5" />}
                title="Ko'rish"
                onClick={() => setPanelStudent(s)}
                tone="primary"
              />
              <IconAction
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                title="Xabar"
                onClick={() => {}}
              />
              {canManage && (
                <IconAction
                  icon={s.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  title={s.isActive ? 'Bloklash' : 'Faollashtirish'}
                  tone="danger"
                  onClick={async () => {
                    if (s.isActive) {
                      if (await ask({ title: "O'quvchini bloklashni tasdiqlang", description: "O'quvchi bloklanadi.", variant: 'destructive', confirmText: 'Bloklash' })) blockMutation.mutate(s.id);
                    } else restoreMutation.mutate(s.id);
                  }}
                />
              )}
            </>
          )}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <GraduationCap className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">O'quvchilar topilmadi</p>
              <p className="text-xs text-xedu-slate-400">Filterlarni yoki qidiruvni o'zgartirib ko'ring</p>
            </div>
          }
        />
      </WorkspaceMain>

      {/* Sidebar: Student insights */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Umumiy statistika" icon={<Users className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={totalCount} />
            <StatPill label="Faol" value={students.filter((s) => s.isActive).length} tone="success" />
            <StatPill label="Nofaol" value={students.filter((s) => !s.isActive).length} tone="urgent" />
            <StatPill label="Sinfga birikmagan" value={students.filter((s) => !s.class).length} tone="attention" />
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="Sinflar bo'yicha" icon={<GraduationCap className="h-4 w-4" />}>
          <div className="space-y-1">
            {classList.slice(0, 8).map((c: any) => {
              const count = students.filter((s) => s.class?.id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setFilterClass(filterClass === c.id ? '' : c.id)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors',
                    filterClass === c.id
                      ? 'bg-xedu-primary-light text-xedu-primary'
                      : 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800'
                  )}
                >
                  <span className="text-xs font-medium truncate">{c.name}</span>
                  <span className="text-xs font-bold tabular-nums text-xedu-slate-500">{count}</span>
                </button>
              );
            })}
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/attendance" icon={ClipboardCheck} label="Davomat" />
            <QuickLink href="/dashboard/grades" icon={GraduationCap} label="Baholar" />
            <QuickLink href="/dashboard/exams" icon={AlertTriangle} label="Imtihonlar" />
            <QuickLink href="/dashboard/users/link-parent" icon={Users} label="Ota-ona biriktirish" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Student Entity Panel */}
      <StudentPanel
        student={panelStudent}
        open={!!panelStudent}
        onClose={() => setPanelStudent(null)}
      />

      {/* Bulk toolbar */}
      <FloatingBulkToolbar
        visible={selectedIds.length >= 1}
        selectedIds={selectedIds}
        actions={[
          {
            id: 'message',
            label: 'Xabar yuborish',
            icon: Send,
            tone: 'primary',
            onClick: () => toast({ title: `${selectedIds.length} ta o'quvchiga xabar yuborish` }),
          },
          {
            id: 'export',
            label: 'Export',
            icon: ArrowRight,
            tone: 'neutral',
            onClick: () => toast({ title: `${selectedIds.length} ta o'quvchi export qilindi` }),
          },
          ...(canManage ? [{
            id: 'block',
            label: 'Bloklash',
            icon: XCircle,
            tone: 'danger' as const,
            onClick: async (ids: string[]) => {
              if (await ask({ title: `${ids.length} ta o'quvchini bloklashni tasdiqlang`, description: "O'quvchilar bloklanadi.", variant: 'destructive', confirmText: 'Bloklash' })) {
                ids.forEach((id) => blockMutation.mutate(id));
              }
              clearSelection();
            },
          }] : []),
        ]}
        onClear={clearSelection}
      />
    </WorkspaceShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────



// ── Student Entity Panel ───────────────────────────────────────────────────────

function StudentPanel({
  student,
  open,
  onClose,
}: {
  student: StudentRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!student) return null;

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-xedu-primary-light flex items-center justify-center text-lg font-bold text-xedu-primary">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-xs text-xedu-slate-500">{student.email}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={GraduationCap} label="Sinf" value={student.class?.name ?? "Noma'lum"} />
            <InfoItem icon={MapPin} label="Filial" value={student.branch?.name ?? "Noma'lum"} />
            <InfoItem icon={Phone} label="Telefon" value={student.phone ?? "Noma'lum"} />
            <InfoItem icon={Mail} label="Email" value={student.email} />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <SecondaryAction icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/users/${student.id}`; }}>
              Profil
            </SecondaryAction>
            <SecondaryAction icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => {}}>
              Xabar
            </SecondaryAction>
            <SecondaryAction icon={<Wallet className="h-3.5 w-3.5" />} onClick={() => { window.location.href = '/dashboard/payments'; }}>
              To'lov
            </SecondaryAction>
            <SecondaryAction icon={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={() => { window.location.href = '/dashboard/attendance'; }}>
              Davomat
            </SecondaryAction>
          </div>
        </div>
      ),
    },
    {
      id: 'academic',
      label: "Akademik",
      content: (
        <div className="p-5">
          <div className="flex flex-col items-center py-8 gap-2">
            <GraduationCap className="h-6 w-6 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Akademik ma'lumotlar mavjud emas</p>
            <Link href="/dashboard/grades" className="text-xs font-semibold text-xedu-primary hover:underline">
              Baholarga o'tish →
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'attendance',
      label: 'Davomat',
      content: (
        <div className="p-5">
          <div className="flex flex-col items-center py-8 gap-2">
            <ClipboardCheck className="h-6 w-6 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Davomat ma'lumotlari mavjud emas</p>
            <Link href="/dashboard/attendance" className="text-xs font-semibold text-xedu-primary hover:underline">
              Davomatga o'tish →
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'finance',
      label: 'Moliya',
      content: (
        <div className="p-5">
          <div className="flex flex-col items-center py-8 gap-2">
            <Wallet className="h-6 w-6 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Moliyaviy ma'lumotlar mavjud emas</p>
            <Link href="/dashboard/payments" className="text-xs font-semibold text-xedu-primary hover:underline">
              To'lovlarga o'tish →
            </Link>
          </div>
        </div>
      ),
    },
  ];

  return (
    <EntityPanel
      open={open}
      onClose={onClose}
      entityType="student"
      title={`${student.firstName} ${student.lastName}`}
      subtitle={student.class?.name}
      status={student.isActive ? 'active' : 'inactive'}
      metrics={[
        { label: 'Sinf', value: student.class?.name ?? '—', tone: 'calm' },
        { label: 'Filial', value: student.branch?.name ?? '—', tone: 'calm' },
        { label: 'Holat', value: student.isActive ? 'Faol' : 'Nofaol', tone: student.isActive ? 'success' : 'urgent' },
      ]}
      tabs={tabs}
    />
  );
}

