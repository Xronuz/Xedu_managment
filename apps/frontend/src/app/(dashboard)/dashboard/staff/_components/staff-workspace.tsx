'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, Search, Users, Phone, Mail, MapPin, GraduationCap,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Clock,
  MessageSquare, Eye, Send, BookOpen, Shield, BarChart3,
  Wallet, Filter, X, Calendar, UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';

import { usersApi } from '@/lib/api/users';
import { branchesApi } from '@/lib/api/branches';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { leaveRequestsApi } from '@/lib/api/leave-requests';

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
   STAFF / TEACHERS WORKSPACE
   Institutional academic operations workspace for staff management.
   ═══════════════════════════════════════════════════════════════════════════════ */

const STAFF_ROLES = [
  { value: 'teacher', label: "O'qituvchi", icon: BookOpen },
  { value: 'class_teacher', label: 'Sinf rahbari', icon: GraduationCap },
  { value: 'vice_principal', label: "Mudir o'rinbosari", icon: Shield },
  { value: 'branch_admin', label: 'Filial admin', icon: MapPin },
  { value: 'accountant', label: 'Buxgalter', icon: Wallet },
  { value: 'librarian', label: 'Kutubxonachi', icon: BookOpen },
  { value: 'director', label: 'Direktor', icon: UserCheck },
];

interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  isActive: boolean;
  branch?: { id: string; name: string } | null;
  assignedClasses?: { id: string; name: string }[];
  assignedSubjects?: { id: string; name: string }[];
  createdAt: string;
}

export function StaffWorkspace() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isDirector = user?.role === 'director';
  const isVP = user?.role === 'vice_principal';
  const isBranchAdmin = user?.role === 'branch_admin';
  const canManage = isDirector || isVP || isBranchAdmin;

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    window.clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = window.setTimeout(() => setDebouncedSearch(v), 300);
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff', debouncedSearch, filterRole, filterBranch, filterStatus],
    queryFn: () => usersApi.getAll({
      search: debouncedSearch || undefined,
      role: filterRole || undefined,
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

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll(),
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['leave-requests', 'pending'],
    queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }),
  });

  const staffList: any[] = (staffData as any)?.data ?? [];
  const branches: any[] = (branchesData as any)?.data ?? (Array.isArray(branchesData) ? branchesData : []);
  const classList: any[] = (classesData as any)?.data ?? (Array.isArray(classesData) ? classesData : []);
  const subjectList: any[] = (subjectsData as any)?.data ?? (Array.isArray(subjectsData) ? subjectsData : []);
  const leaveList: any[] = (pendingLeaves as any)?.data ?? (Array.isArray(pendingLeaves) ? pendingLeaves : []);

  // Exclude students and parents from staff view
  const excludedRoles = ['student', 'parent'];
  const staff: StaffRow[] = useMemo(() => {
    return staffList
      .filter((s: any) => !excludedRoles.includes(s.role))
      .filter((s: any) => {
        if (filterStatus === 'active' && !s.isActive) return false;
        if (filterStatus === 'inactive' && s.isActive) return false;
        return true;
      })
      .map((s: any) => {
        // Derive assigned classes from classList where this teacher is assigned
        const assignedClasses = classList.filter((c: any) =>
          c.classTeacherId === s.id || c.students?.some((st: any) => st.teacherId === s.id)
        );
        // Derive assigned subjects
        const assignedSubjects = subjectList.filter((sub: any) => sub.teacherId === s.id);
        return { ...s, assignedClasses, assignedSubjects };
      });
  }, [staffList, filterStatus, classList, subjectList]);

  const totalCount = (staffData as any)?.meta?.total ?? staffList.length;

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelStaff, setPanelStaff] = useState<StaffRow | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === staff.length && staff.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(staff.map((s) => s.id));
    }
  }, [selectedIds.length, staff]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const blockMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({ title: 'Xodim bloklandi' });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => usersApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({ title: 'Xodim faollashtirildi' });
    },
  });

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterRole) {
      const r = STAFF_ROLES.find((x) => x.value === filterRole);
      chips.push({ key: 'role', label: r?.label ?? filterRole, onClear: () => setFilterRole('') });
    }
    if (filterBranch) {
      const b = branches.find((x) => x.id === filterBranch);
      chips.push({ key: 'branch', label: b?.name ?? 'Filial', onClear: () => setFilterBranch('') });
    }
    if (filterStatus) {
      chips.push({ key: 'status', label: filterStatus === 'active' ? 'Faol' : 'Nofaol', onClear: () => setFilterStatus('') });
    }
    return chips;
  }, [filterRole, filterBranch, filterStatus, branches]);

  // ── Staffing intelligence ──────────────────────────────────────────────────
  const teacherCount = staff.filter((s) => s.role === 'teacher').length;
  const classTeacherCount = staff.filter((s) => s.role === 'class_teacher').length;
  const onLeave = leaveList.length;
  const inactiveCount = staff.filter((s) => !s.isActive).length;
  const unassignedTeachers = staff.filter((s) =>
    (s.role === 'teacher' || s.role === 'class_teacher') && (!s.assignedClasses || s.assignedClasses.length === 0)
  ).length;

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Xodim',
      cell: (s: StaffRow) => (
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
      key: 'role',
      header: 'Rol',
      width: '120px',
      cell: (s: StaffRow) => {
        const roleCfg = STAFF_ROLES.find((r) => r.value === s.role);
        return (
          <span className={cn(
            'inline-flex items-center gap-1 text-2xs font-bold px-1.5 py-0.5 rounded border',
            s.role === 'teacher' ? 'bg-xedu-sky-50 text-xedu-sky-600 border-xedu-sky-100' :
            s.role === 'class_teacher' ? 'bg-xedu-violet-50 text-xedu-violet-600 border-xedu-violet-100' :
            s.role === 'director' ? 'bg-xedu-slate-100 text-xedu-slate-700 border-xedu-slate-200' :
            'bg-xedu-slate-50 text-xedu-slate-600 border-xedu-slate-100'
          )}>
            {roleCfg?.label ?? s.role}
          </span>
        );
      },
    },
    {
      key: 'branch',
      header: 'Filial',
      width: '110px',
      cell: (s: StaffRow) => (
        <span className="text-xedu-slate-500 text-xs">{s.branch?.name ?? '—'}</span>
      ),
    },
    {
      key: 'classes',
      header: 'Sinflar',
      width: '80px',
      cell: (s: StaffRow) => (
        <span className={cn(
          'text-xs font-bold tabular-nums',
          s.assignedClasses && s.assignedClasses.length > 0 ? 'text-xedu-slate-700' : 'text-xedu-amber-500'
        )}>
          {s.assignedClasses?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'subjects',
      header: 'Fanlar',
      width: '80px',
      cell: (s: StaffRow) => (
        <span className="text-xs font-bold tabular-nums text-xedu-slate-700">
          {s.assignedSubjects?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      width: '80px',
      cell: (s: StaffRow) => (
        <div className="flex items-center gap-1.5">
          <div className={cn('h-2 w-2 rounded-full', s.isActive ? 'bg-xedu-primary' : 'bg-xedu-ruby-400')} />
          <span className={cn('text-2xs font-bold', s.isActive ? 'text-xedu-primary' : 'text-xedu-ruby-500')}>
            {s.isActive ? 'Faol' : 'Nofaol'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      width: '110px',
      cell: (s: StaffRow) => (
        <span className="text-xedu-slate-500 text-xs">{s.phone ?? '—'}</span>
      ),
    },
  ], []);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="Xodimlar"
          subtitle={`${totalCount} ta xodim · Maktab kadrlari`}
          icon={<Briefcase className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            canManage && (
              <ActionBar
                primary={
                  <PrimaryAction onClick={() => { window.location.href = '/dashboard/users'; }}>
                    + Xodim qo&apos;shish
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
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ism, familiya, email, telefon..."
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
              <button onClick={f.onClear} className="hover:text-xedu-ruby-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {activeFilters.length > 0 && (
            <button
              onClick={() => { setFilterRole(''); setFilterBranch(''); setFilterStatus(''); }}
              className="text-xs font-semibold text-xedu-slate-400 hover:text-xedu-ruby-500 transition-colors"
            >
              Tozalash
            </button>
          )}
        </WorkspaceToolbar>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pb-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              <option value="">Barcha rollar</option>
              {STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              <option value="">Barcha filiallar</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              <option value="">Barcha holatlar</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>
        )}
      </div>

      {/* Main: Staff table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={staff}
          rowKey={(s) => s.id}
          density="compact"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          rowTone={(s) => {
            if (!s.isActive) return 'muted';
            if (s.role === 'teacher' && (!s.assignedClasses || s.assignedClasses.length === 0)) return 'attention';
            return 'neutral';
          }}
          rowActions={(s) => (
            <>
              <IconAction
                icon={<Eye className="h-3.5 w-3.5" />}
                title="Ko'rish"
                onClick={() => setPanelStaff(s)}
                tone="primary"
              />
              <IconAction
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                title="Xabar"
                onClick={() => {}}
              />
              <IconAction
                icon={<Calendar className="h-3.5 w-3.5" />}
                title="Dars jadvali"
                onClick={() => { window.location.href = '/dashboard/schedule'; }}
              />
              {canManage && (
                <IconAction
                  icon={s.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  title={s.isActive ? 'Bloklash' : 'Faollashtirish'}
                  tone="danger"
                  onClick={() => {
                    if (s.isActive) blockMutation.mutate(s.id);
                    else restoreMutation.mutate(s.id);
                  }}
                />
              )}
            </>
          )}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Briefcase className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">Xodimlar topilmadi</p>
              <p className="text-xs text-xedu-slate-400">Filterlarni yoki qidiruvni o&apos;zgartirib ko&apos;ring</p>
            </div>
          }
        />
      </WorkspaceMain>

      {/* Right sidebar: Staffing intelligence */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Kadrlar statistikasi" icon={<Users className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={staff.length} />
            <StatPill label="Faol" value={staff.filter((s) => s.isActive).length} tone="success" />
            <StatPill label="Nofaol" value={inactiveCount} tone="urgent" />
            <StatPill label="Ta'tilda" value={onLeave} tone="attention" />
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="Rollar bo'yicha" icon={<Shield className="h-4 w-4" />}>
          <div className="space-y-1">
            {STAFF_ROLES.filter((r) => staff.some((s) => s.role === r.value)).map((r) => {
              const count = staff.filter((s) => s.role === r.value).length;
              return (
                <button
                  key={r.value}
                  onClick={() => setFilterRole(filterRole === r.value ? '' : r.value)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors',
                    filterRole === r.value
                      ? 'bg-xedu-primary-light text-xedu-primary'
                      : 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800'
                  )}
                >
                  <span className="text-xs font-medium">{r.label}</span>
                  <span className="text-xs font-bold tabular-nums text-xedu-slate-500">{count}</span>
                </button>
              );
            })}
          </div>
        </WorkspaceSection>

        {/* Staffing intelligence alerts */}
        {unassignedTeachers > 0 && (
          <WorkspaceSection title="Diqqat talab" icon={<AlertTriangle className="h-4 w-4 text-xedu-amber-500" />}>
            <div className="flex items-start gap-2 px-1 py-1">
              <AlertTriangle className="h-3.5 w-3.5 text-xedu-amber-500 shrink-0 mt-0.5" />
              <p className="text-[12px] font-medium text-xedu-slate-700 leading-snug">
                {unassignedTeachers} ta o&apos;qituvchi sinfga biriktirilmagan
              </p>
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/schedule" icon={Calendar} label="Dars jadvali" />
            <QuickLink href="/dashboard/leave-requests" icon={Clock} label="Ta'til so'rovlari" />
            <QuickLink href="/dashboard/classes" icon={GraduationCap} label="Sinflar" />
            <QuickLink href="/dashboard/users" icon={Users} label="Batafsil boshqaruv" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Staff Entity Panel */}
      <StaffPanel
        staff={panelStaff}
        open={!!panelStaff}
        onClose={() => setPanelStaff(null)}
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
            onClick: () => toast({ title: `${selectedIds.length} ta xodimga xabar yuborish` }),
          },
          {
            id: 'export',
            label: 'Export',
            icon: ArrowRight,
            tone: 'neutral',
            onClick: () => toast({ title: `${selectedIds.length} ta xodim export qilindi` }),
          },
          ...(canManage ? [{
            id: 'block',
            label: 'Bloklash',
            icon: XCircle,
            tone: 'danger' as const,
            onClick: (ids: string[]) => {
              ids.forEach((id) => blockMutation.mutate(id));
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



// ── Staff Entity Panel ─────────────────────────────────────────────────────────

function StaffPanel({
  staff,
  open,
  onClose,
}: {
  staff: StaffRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!staff) return null;

  const roleCfg = STAFF_ROLES.find((r) => r.value === staff.role);

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-xedu-primary-light flex items-center justify-center text-lg font-bold text-xedu-primary">
              {staff.firstName[0]}{staff.lastName[0]}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
                {staff.firstName} {staff.lastName}
              </p>
              <p className="text-xs text-xedu-slate-500">{roleCfg?.label ?? staff.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={Shield} label="Rol" value={roleCfg?.label ?? staff.role} />
            <InfoItem icon={MapPin} label="Filial" value={staff.branch?.name ?? "Noma'lum"} />
            <InfoItem icon={Phone} label="Telefon" value={staff.phone ?? "Noma'lum"} />
            <InfoItem icon={Mail} label="Email" value={staff.email} />
          </div>

          {/* Assigned classes */}
          {staff.assignedClasses && staff.assignedClasses.length > 0 && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1.5">Biiktirirlgan sinflar</p>
              <div className="flex flex-wrap gap-1">
                {staff.assignedClasses.map((c) => (
                  <span key={c.id} className="text-2xs font-bold px-1.5 py-0.5 rounded border border-xedu-slate-100 bg-xedu-slate-50 text-xedu-slate-600">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Assigned subjects */}
          {staff.assignedSubjects && staff.assignedSubjects.length > 0 && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1.5">O'tadigan fanlar</p>
              <div className="flex flex-wrap gap-1">
                {staff.assignedSubjects.map((s) => (
                  <span key={s.id} className="text-2xs font-bold px-1.5 py-0.5 rounded border border-xedu-sky-100 bg-xedu-sky-50 text-xedu-sky-600">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <SecondaryAction icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/users/${staff.id}`; }}>
              Profil
            </SecondaryAction>
            <SecondaryAction icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => {}}>
              Xabar
            </SecondaryAction>
            <SecondaryAction icon={<Calendar className="h-3.5 w-3.5" />} onClick={() => { window.location.href = '/dashboard/schedule'; }}>
              Jadval
            </SecondaryAction>
          </div>
        </div>
      ),
    },
    {
      id: 'schedule',
      label: 'Jadval',
      content: (
        <div className="p-5">
          <div className="flex flex-col items-center py-8 gap-2">
            <Calendar className="h-6 w-6 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Dars jadvali ma'lumotlari mavjud emas</p>
            <Link href="/dashboard/schedule" className="text-xs font-semibold text-xedu-primary hover:underline">
              Jadvalga o'tish →
            </Link>
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
            <BarChart3 className="h-6 w-6 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Akademik ma'lumotlar mavjud emas</p>
            <Link href="/dashboard/grades" className="text-xs font-semibold text-xedu-primary hover:underline">
              Baholarga o'tish →
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'workload',
      label: 'Yuklama',
      content: (
        <div className="p-5">
          <div className="flex flex-col items-center py-8 gap-2">
            <Clock className="h-6 w-6 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Yuklama ma'lumotlari mavjud emas</p>
            <p className="text-xs text-xedu-slate-400">Dars soatlari va ish yuklamasi keyinchalik qo'shiladi</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <EntityPanel
      open={open}
      onClose={onClose}
      entityType={staff.role === 'teacher' || staff.role === 'class_teacher' ? 'teacher' : 'staff'}
      title={`${staff.firstName} ${staff.lastName}`}
      subtitle={roleCfg?.label ?? staff.role}
      status={staff.isActive ? 'active' : 'inactive'}
      metrics={[
        { label: 'Rol', value: roleCfg?.label ?? '—', tone: 'calm' },
        { label: 'Filial', value: staff.branch?.name ?? '—', tone: 'calm' },
        { label: 'Sinflar', value: staff.assignedClasses?.length ?? 0, tone: (staff.assignedClasses?.length ?? 0) > 0 ? 'success' : 'attention' },
      ]}
      tabs={tabs}
    />
  );
}

