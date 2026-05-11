'use client';

import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@/components/workspace-system/use-debounced-value';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  School, Search, Users, GraduationCap, MapPin, BookOpen,
  Calendar, ClipboardCheck, BarChart3, Clock, AlertTriangle,
  CheckCircle2, XCircle, ArrowRight, Eye, MessageSquare,
  Send, Pencil, Trash2, Plus, Filter, X, UserCheck,
  ChevronRight, TrendingUp, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { branchesApi } from '@/lib/api/branches';
import { subjectsApi } from '@/lib/api/subjects';
import { scheduleApi } from '@/lib/api/schedule';
import { useConfirm } from '@/store/confirm.store';
import { gradesApi } from '@/lib/api/grades';

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
   CLASSES WORKSPACE
   Institutional academic operations workspace for class management.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface ClassRow {
  id: string;
  name: string;
  gradeLevel: number;
  academicYear: string;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  classTeacherId?: string | null;
  classTeacher?: { id: string; firstName: string; lastName: string } | null;
  _count?: { students: number };
  students?: any[];
  subjects?: any[];
  isActive?: boolean;
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = [`${currentYear}-${currentYear + 1}`, `${currentYear - 1}-${currentYear}`];

const MODAL_EMPTY = { name: '', gradeLevel: '', academicYear: ACADEMIC_YEARS[0], classTeacherId: '', branchId: '' };

export function ClassesWorkspace() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const ask = useConfirm();

  const isDirector = user?.role === 'director';
  const isVP = user?.role === 'vice_principal';
  const isBranchAdmin = user?.role === 'branch_admin';
  const isTeacher = user?.role === 'teacher';
  const isClassTeacher = user?.role === 'class_teacher';
  const canManage = isDirector || isVP || isBranchAdmin;
  const canDelete = isDirector;

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showFilters, setShowFilters] = useState(false);


  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: rawClasses, isLoading } = useQuery({
    queryKey: ['classes', debouncedSearch, filterBranch, filterTeacher, filterGrade],
    queryFn: classesApi.getAll,
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers-for-classes'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 200, role: 'teacher' }),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll(),
  });

  const branches: any[] = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];
  const teachers: any[] = (teachersData as any)?.data ?? [];
  const allSubjects: any[] = Array.isArray(subjectsData) ? subjectsData : (subjectsData as any)?.data ?? [];

  const classList: ClassRow[] = useMemo(() => {
    const arr: ClassRow[] = Array.isArray(rawClasses) ? rawClasses : (rawClasses as any)?.data ?? [];
    return arr.map((c) => {
      const classSubjects = allSubjects.filter((s: any) => s.classIds?.includes(c.id) || s.classId === c.id);
      return { ...c, subjects: classSubjects };
    });
  }, [rawClasses, allSubjects]);

  // Apply frontend filters
  const classes = useMemo(() => {
    return classList.filter((c) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(q);
        const teacherMatch = c.classTeacher
          ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}`.toLowerCase().includes(q)
          : false;
        const branchMatch = c.branch?.name?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !teacherMatch && !branchMatch) return false;
      }
      if (filterBranch && c.branchId !== filterBranch) return false;
      if (filterTeacher) {
        if (filterTeacher === '__none__') {
          if (c.classTeacherId) return false;
        } else if (c.classTeacherId !== filterTeacher) {
          return false;
        }
      }
      if (filterGrade && String(c.gradeLevel) !== filterGrade) return false;
      return true;
    });
  }, [classList, debouncedSearch, filterBranch, filterTeacher, filterGrade]);

  // ── Selection + Panel ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelClass, setPanelClass] = useState<ClassRow | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === classes.length && classes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(classes.map((c) => c.id));
    }
  }, [selectedIds.length, classes]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Create / Edit modal state ──────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(MODAL_EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const closeDialog = () => {
    setModalOpen(false);
    setEditClass(null);
    setForm(MODAL_EMPTY);
    setErrors({});
  };

  const openCreate = () => {
    setEditClass(null);
    setForm(MODAL_EMPTY);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (cls: ClassRow) => {
    setEditClass(cls);
    setForm({
      name: cls.name,
      gradeLevel: String(cls.gradeLevel),
      academicYear: cls.academicYear,
      classTeacherId: cls.classTeacherId ?? '',
      branchId: cls.branchId ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Sinf nomi kiritilishi shart';
    if (!form.gradeLevel) e.gradeLevel = 'Sinf darajasi tanlang';
    if (!form.academicYear.trim()) e.academicYear = "O'quv yilini kiriting";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => {
      toast({ title: "Sinf qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      closeDialog();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => classesApi.update(id, payload),
    onSuccess: () => {
      toast({ title: 'Sinf yangilandi' });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      closeDialog();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: classesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({ title: "Sinf o'chirildi" });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xato yuz berdi' });
    },
  });

  const handleSubmit = () => {
    if (!validate()) return;
    const teacherId = form.classTeacherId === '__none__' ? null : (form.classTeacherId || undefined);
    if (editClass) {
      updateMutation.mutate({
        id: editClass.id,
        payload: {
          name: form.name.trim(),
          gradeLevel: Number(form.gradeLevel),
          classTeacherId: teacherId,
          branchId: form.branchId?.trim() || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        gradeLevel: Number(form.gradeLevel),
        academicYear: form.academicYear.trim(),
        classTeacherId: teacherId as any,
        branchId: form.branchId?.trim() || undefined,
      } as any);
    }
  };

  const sel = (k: string) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterBranch) {
      const b = branches.find((x) => x.id === filterBranch);
      chips.push({ key: 'branch', label: b?.name ?? 'Filial', onClear: () => setFilterBranch('') });
    }
    if (filterTeacher) {
      if (filterTeacher === '__none__') {
        chips.push({ key: 'teacher', label: 'Rahbarisiz', onClear: () => setFilterTeacher('') });
      } else {
        const t = teachers.find((x) => x.id === filterTeacher);
        chips.push({ key: 'teacher', label: t ? `${t.firstName} ${t.lastName}` : 'Rahbar', onClear: () => setFilterTeacher('') });
      }
    }
    if (filterGrade) {
      chips.push({ key: 'grade', label: `${filterGrade}-sinf`, onClear: () => setFilterGrade('') });
    }
    return chips;
  }, [filterBranch, filterTeacher, filterGrade, branches, teachers]);

  // ── Academic intelligence ──────────────────────────────────────────────────
  const totalClasses = classes.length;
  const withoutTeacher = classes.filter((c) => !c.classTeacherId).length;
  const withoutStudents = classes.filter((c) => (c._count?.students ?? 0) === 0).length;
  const avgSize = totalClasses > 0
    ? Math.round(classes.reduce((sum, c) => sum + (c._count?.students ?? 0), 0) / totalClasses)
    : 0;

  const gradeDistribution = useMemo(() => {
    const map = new Map<number, number>();
    classes.forEach((c) => {
      map.set(c.gradeLevel, (map.get(c.gradeLevel) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [classes]);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Sinf',
      cell: (c: ClassRow) => (
        <div className="min-w-0">
          <p className="font-bold text-xedu-slate-900 dark:text-xedu-slate-100 text-xs">{c.name}</p>
          <p className="text-2xs text-xedu-slate-400">{c.academicYear}</p>
        </div>
      ),
    },
    {
      key: 'grade',
      header: 'Daraja',
      width: '70px',
      cell: (c: ClassRow) => (
        <span className="text-xs font-bold px-1.5 py-0.5 rounded border border-xedu-slate-100 bg-xedu-slate-50 text-xedu-slate-600">
          {c.gradeLevel}-sinf
        </span>
      ),
    },
    {
      key: 'branch',
      header: 'Filial',
      width: '110px',
      cell: (c: ClassRow) => (
        <span className="text-xedu-slate-500 text-xs">{c.branch?.name ?? '—'}</span>
      ),
    },
    {
      key: 'teacher',
      header: 'Sinf rahbari',
      width: '140px',
      cell: (c: ClassRow) => {
        if (!c.classTeacher) {
          return (
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-xedu-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Biriktirilmagan
            </span>
          );
        }
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-5 w-5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center shrink-0 text-2xs font-bold text-xedu-slate-500">
              {c.classTeacher.firstName[0]}{c.classTeacher.lastName[0]}
            </div>
            <span className="text-xs font-medium text-xedu-slate-700 truncate">
              {c.classTeacher.firstName} {c.classTeacher.lastName}
            </span>
          </div>
        );
      },
    },
    {
      key: 'students',
      header: "O'quvchilar",
      width: '80px',
      cell: (c: ClassRow) => {
        const count = c._count?.students ?? 0;
        return (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-xedu-slate-400" />
            <span className={cn('text-xs font-bold tabular-nums', count === 0 ? 'text-xedu-amber-500' : 'text-xedu-slate-700')}>
              {count}
            </span>
          </div>
        );
      },
    },
    {
      key: 'subjects',
      header: 'Fanlar',
      width: '70px',
      cell: (c: ClassRow) => (
        <span className="text-xs font-bold tabular-nums text-xedu-slate-700">
          {c.subjects?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      width: '80px',
      cell: (c: ClassRow) => {
        const noTeacher = !c.classTeacherId;
        const noStudents = (c._count?.students ?? 0) === 0;
        if (noTeacher || noStudents) {
          return (
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-xedu-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Diqqat
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-2xs font-bold text-xedu-primary">
            <CheckCircle2 className="h-3 w-3" />
            Tayyor
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
          title="Sinflar"
          subtitle={`${totalClasses} ta sinf · Akademik operatsiyalar`}
          icon={<School className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            canManage && (
              <ActionBar
                primary={
                  <PrimaryAction onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                    Sinf qo&apos;shish
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
              placeholder="Sinf nomi, rahbar, filial..."
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
              onClick={() => { setFilterBranch(''); setFilterTeacher(''); setFilterGrade(''); }}
              className="text-xs font-semibold text-xedu-slate-400 hover:text-xedu-ruby-500 transition-colors"
            >
              Tozalash
            </button>
          )}
        </WorkspaceToolbar>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pb-2">
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
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha rahbarlar</option>
              <option value="__none__">Rahbarisiz</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>

            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha darajalar</option>
              {GRADES.map((g) => (
                <option key={g} value={String(g)}>{g}-sinf</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main: Classes table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={classes}
          rowKey={(c) => c.id}
          density="compact"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          rowTone={(c) => {
            if (!c.classTeacherId) return 'attention';
            if ((c._count?.students ?? 0) === 0) return 'attention';
            return 'neutral';
          }}
          rowActions={(c) => (
            <>
              <IconAction
                icon={<Eye className="h-3.5 w-3.5" />}
                title="Ko'rish"
                onClick={() => setPanelClass(c)}
                tone="primary"
              />
              <IconAction
                icon={<Users className="h-3.5 w-3.5" />}
                title="O'quvchilar"
                onClick={() => { window.location.href = `/dashboard/classes/${c.id}`; }}
              />
              <IconAction
                icon={<Calendar className="h-3.5 w-3.5" />}
                title="Jadval"
                onClick={() => { window.location.href = '/dashboard/schedule'; }}
              />
              <IconAction
                icon={<ClipboardCheck className="h-3.5 w-3.5" />}
                title="Davomat"
                onClick={() => { window.location.href = '/dashboard/attendance'; }}
              />
              {canManage && (
                <>
                  <IconAction
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    title="Tahrirlash"
                    onClick={() => openEdit(c)}
                  />
                  {canDelete && (
                    <IconAction
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      title="O'chirish"
                      tone="danger"
                      onClick={async () => { if (await ask({ title: "Sinfni o'chirishni tasdiqlang", description: "Sinf o'chiriladi. Barcha o'quvchilar va jadval ma'lumotlari bekor bo'ladi.", variant: 'destructive', confirmText: "O'chirish" })) deleteMutation.mutate(c.id); }}
                    />
                  )}
                </>
              )}
            </>
          )}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <School className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">Sinflar topilmadi</p>
              <p className="text-xs text-xedu-slate-400">Filterlarni yoki qidiruvni o&apos;zgartirib ko&apos;ring</p>
            </div>
          }
        />
      </WorkspaceMain>

      {/* Right sidebar: Academic intelligence */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Sinf statistikasi" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={totalClasses} />
            <StatPill label="O'rtacha" value={avgSize} suffix=" ta" />
            <StatPill label="Rahbarisiz" value={withoutTeacher} tone={withoutTeacher > 0 ? 'urgent' : 'calm'} />
            <StatPill label="Bo'sh" value={withoutStudents} tone={withoutStudents > 0 ? 'attention' : 'calm'} />
          </div>
        </WorkspaceSection>

        {gradeDistribution.length > 0 && (
          <WorkspaceSection title="Daraja bo'yicha" icon={<GraduationCap className="h-4 w-4" />}>
            <div className="space-y-1">
              {gradeDistribution.map(([grade, count]) => (
                <button
                  key={grade}
                  onClick={() => setFilterGrade(filterGrade === String(grade) ? '' : String(grade))}
                  className={cn(
                    'w-full flex items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors',
                    filterGrade === String(grade)
                      ? 'bg-xedu-primary-light text-xedu-primary'
                      : 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800'
                  )}
                >
                  <span className="text-xs font-medium">{grade}-sinf</span>
                  <span className="text-xs font-bold tabular-nums text-xedu-slate-500">{count}</span>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {/* Intelligence alerts */}
        {(withoutTeacher > 0 || withoutStudents > 0) && (
          <WorkspaceSection title="Diqqat talab" icon={<AlertTriangle className="h-4 w-4 text-xedu-amber-500" />}>
            <div className="space-y-1.5">
              {withoutTeacher > 0 && (
                <div className="flex items-start gap-2 px-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-xedu-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] font-medium text-xedu-slate-700 leading-snug">
                    {withoutTeacher} ta sinfga rahbar biriktirilmagan
                  </p>
                </div>
              )}
              {withoutStudents > 0 && (
                <div className="flex items-start gap-2 px-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-xedu-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] font-medium text-xedu-slate-700 leading-snug">
                    {withoutStudents} ta sinfda o&apos;quvchi yo&apos;q
                  </p>
                </div>
              )}
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/schedule" icon={Calendar} label="Dars jadvali" />
            <QuickLink href="/dashboard/attendance" icon={ClipboardCheck} label="Davomat" />
            <QuickLink href="/dashboard/grades" icon={BarChart3} label="Baholar" />
            <QuickLink href="/dashboard/subjects" icon={BookOpen} label="Fanlar" />
            <QuickLink href="/dashboard/exams" icon={FileText} label="Imtihonlar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Class Entity Panel */}
      <ClassPanel
        cls={panelClass}
        open={!!panelClass}
        onClose={() => setPanelClass(null)}
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
            onClick: () => toast({ title: `${selectedIds.length} ta sinf export qilindi` }),
          },
          {
            id: 'message',
            label: 'Rahbarlarga xabar',
            icon: Send,
            tone: 'primary',
            onClick: () => toast({ title: `${selectedIds.length} ta sinf rahbariga xabar` }),
          },
        ]}
        onClear={clearSelection}
      />

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editClass ? 'Sinfni tahrirlash' : "Yangi sinf qo'shish"}</DialogTitle>
            <DialogDescription>Sinf ma&apos;lumotlarini kiriting</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Sinf nomi <span className="text-xedu-ruby">*</span></Label>
              <Input placeholder="Masalan: 5-A" value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => { const n = { ...er }; delete n.name; return n; }); }} />
              {errors.name && <p className="text-xs text-xedu-ruby">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf darajasi <span className="text-xedu-ruby">*</span></Label>
                <Select value={form.gradeLevel} onValueChange={sel('gradeLevel')}>
                  <SelectTrigger><SelectValue placeholder="1-12..." /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={String(g)}>{g}-sinf</SelectItem>)}</SelectContent>
                </Select>
                {errors.gradeLevel && <p className="text-xs text-xedu-ruby">{errors.gradeLevel}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>O&apos;quv yili <span className="text-xedu-ruby">*</span></Label>
                <Select value={form.academicYear} onValueChange={sel('academicYear')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACADEMIC_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
                {errors.academicYear && <p className="text-xs text-xedu-ruby">{errors.academicYear}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sinf rahbari</Label>
              <Select value={form.classTeacherId || '__none__'} onValueChange={sel('classTeacherId')}>
                <SelectTrigger><SelectValue placeholder="Ixtiyoriy..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Rahbarisiz —</SelectItem>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {branches.length > 0 && (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Select value={form.branchId || '__auto__'} onValueChange={(v) => sel('branchId')(v === '__auto__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Filial tanlang..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">Joriy filial (avtomatik)</SelectItem>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <SecondaryAction onClick={closeDialog}>Bekor qilish</SecondaryAction>
            <PrimaryAction
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {editClass ? 'Saqlash' : "Qo'shish"}
            </PrimaryAction>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────



// ── Class Entity Panel ─────────────────────────────────────────────────────────

function ClassPanel({
  cls,
  open,
  onClose,
}: {
  cls: ClassRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['class-detail', cls?.id],
    queryFn: () => (cls ? classesApi.getOne(cls.id) : null),
    enabled: !!cls,
  });

  const { data: classStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students', cls?.id],
    queryFn: () => (cls ? classesApi.getStudents(cls.id) : []),
    enabled: !!cls,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ['class-schedule', cls?.id],
    queryFn: () => (cls ? scheduleApi.getByClass(cls.id) : []),
    enabled: !!cls,
  });

  const { data: gradesReport } = useQuery({
    queryKey: ['class-grades', cls?.id],
    queryFn: () => (cls ? gradesApi.getClassGpa(cls.id) : null),
    enabled: !!cls,
  });

  if (!cls) return null;

  const detail: any = detailData ?? cls;
  const students: any[] = Array.isArray(classStudents) ? classStudents : (classStudents as any)?.data ?? [];
  const schedule: any[] = Array.isArray(scheduleData) ? scheduleData : (scheduleData as any)?.data ?? [];
  const gpa = gradesReport as any;

  const studentCount = students.length || cls._count?.students || 0;
  const classSubjects = detail.subjects ?? cls.subjects ?? [];

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-xedu-primary-light flex items-center justify-center text-lg font-bold text-xedu-primary">
              {cls.gradeLevel}
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{cls.name}</p>
              <p className="text-xs text-xedu-slate-500">{cls.academicYear}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={GraduationCap} label="Daraja" value={`${cls.gradeLevel}-sinf`} />
            <InfoItem icon={MapPin} label="Filial" value={cls.branch?.name ?? "Noma'lum"} />
            <InfoItem icon={Users} label="O'quvchilar" value={`${studentCount} ta`} />
            <InfoItem icon={BookOpen} label="Fanlar" value={`${classSubjects.length} ta`} />
          </div>

          {cls.classTeacher && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1.5">Sinf rahbari</p>
              <div className="flex items-center gap-2 rounded-md border border-xedu-slate-100 px-2.5 py-2">
                <div className="h-7 w-7 rounded-full bg-xedu-slate-100 flex items-center justify-center text-2xs font-bold text-xedu-slate-500">
                  {cls.classTeacher.firstName[0]}{cls.classTeacher.lastName[0]}
                </div>
                <span className="text-xs font-medium text-xedu-slate-700">
                  {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                </span>
              </div>
            </div>
          )}

          {/* Subjects list */}
          {classSubjects.length > 0 && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1.5">Fanlar</p>
              <div className="flex flex-wrap gap-1">
                {classSubjects.slice(0, 8).map((s: any) => (
                  <span key={s.id} className="text-2xs font-bold px-1.5 py-0.5 rounded border border-xedu-sky-100 bg-xedu-sky-50 text-xedu-sky-600">
                    {s.name}
                  </span>
                ))}
                {classSubjects.length > 8 && (
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded border border-xedu-slate-100 bg-xedu-slate-50 text-xedu-slate-500">
                    +{classSubjects.length - 8}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* GPA if available */}
          {gpa && (
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1.5">O'rtacha GPA</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-xedu-primary">{gpa.classAvg?.toFixed(2) ?? '—'}</span>
                <span className="text-2xs text-xedu-slate-400">sinf o'rtachasi</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <SecondaryAction icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/classes/${cls.id}`; }}>
              Batafsil
            </SecondaryAction>
            <SecondaryAction icon={<Calendar className="h-3.5 w-3.5" />} onClick={() => { window.location.href = '/dashboard/schedule'; }}>
              Jadval
            </SecondaryAction>
            <SecondaryAction icon={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={() => { window.location.href = '/dashboard/attendance'; }}>
              Davomat
            </SecondaryAction>
            <SecondaryAction icon={<BarChart3 className="h-3.5 w-3.5" />} onClick={() => { window.location.href = '/dashboard/grades'; }}>
              Baholar
            </SecondaryAction>
          </div>
        </div>
      ),
    },
    {
      id: 'students',
      label: "O'quvchilar",
      content: (
        <div className="p-5">
          {studentsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 rounded-md bg-xedu-slate-100 dark:bg-xedu-slate-800 animate-pulse" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <Users className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">O'quvchilar mavjud emas</p>
              <Link href={`/dashboard/classes/${cls.id}`} className="text-xs font-semibold text-xedu-primary hover:underline">
                Sinf sahifasiga o'tish →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1.5">
                {students.length} ta o'quvchi
              </p>
              {students.slice(0, 8).map((s: any, idx: number) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors">
                  <span className="text-2xs text-xedu-slate-400 w-4 text-right">{idx + 1}</span>
                  <div className="h-5 w-5 rounded-full bg-xedu-slate-100 flex items-center justify-center text-[8px] font-bold text-xedu-slate-500">
                    {s.firstName?.[0]}{s.lastName?.[0]}
                  </div>
                  <span className="text-xs font-medium text-xedu-slate-700 truncate">
                    {s.firstName} {s.lastName}
                  </span>
                  {s.isActive !== false && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-xedu-primary" />
                  )}
                </div>
              ))}
              {students.length > 8 && (
                <Link href={`/dashboard/classes/${cls.id}`} className="flex items-center gap-1 text-xs font-semibold text-xedu-primary hover:underline pt-1">
                  <ChevronRight className="h-3 w-3" />
                  Barcha {students.length} ta o'quvchini ko'rish
                </Link>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'schedule',
      label: 'Jadval',
      content: (
        <div className="p-5">
          {schedule.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <Calendar className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Dars jadvali mavjud emas</p>
              <Link href="/dashboard/schedule" className="text-xs font-semibold text-xedu-primary hover:underline">
                Jadvalga o'tish →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1.5">
                {schedule.length} ta dars
              </p>
              {schedule.slice(0, 8).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-xedu-slate-100 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">{s.subject?.name ?? 'Fan'}</p>
                    <p className="text-2xs text-xedu-slate-400">
                      {s.dayOfWeek ?? '—'} · {s.startTime ?? '—'} - {s.endTime ?? '—'}
                    </p>
                  </div>
                  {s.teacher && (
                    <span className="text-2xs text-xedu-slate-500 shrink-0">
                      {s.teacher.firstName} {s.teacher.lastName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'subjects',
      label: 'Fanlar',
      content: (
        <div className="p-5">
          {classSubjects.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <BookOpen className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Fanlar mavjud emas</p>
              <Link href="/dashboard/subjects" className="text-xs font-semibold text-xedu-primary hover:underline">
                Fanlarga o'tish →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {classSubjects.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-xedu-slate-100 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700">{s.name}</p>
                    {s.code && <p className="text-2xs text-xedu-slate-400">{s.code}</p>}
                  </div>
                  {s.teacher && (
                    <span className="text-2xs text-xedu-slate-500 shrink-0">
                      {s.teacher.firstName} {s.teacher.lastName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'grades',
      label: 'Baholar',
      content: (
        <div className="p-5">
          {gpa ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-md border border-xedu-slate-100 px-3 py-3">
                <TrendingUp className="h-5 w-5 text-xedu-primary" />
                <div>
                  <p className="text-lg font-bold text-xedu-slate-900">{gpa.classAvg?.toFixed(2) ?? '—'}</p>
                  <p className="text-2xs text-xedu-slate-400">Sinf o'rtachasi</p>
                </div>
              </div>
              {gpa.students && gpa.students.length > 0 && (
                <div className="space-y-1">
                  <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 mb-1">O'quvchilar bo'yicha</p>
                  {gpa.students.slice(0, 8).map((s: any) => (
                    <div key={s.studentId} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-xedu-slate-50 transition-colors">
                      <span className="text-xs font-medium text-xedu-slate-700">{s.name}</span>
                      <span className={cn(
                        'text-xs font-bold tabular-nums',
                        s.gpa >= 4 ? 'text-xedu-primary' : s.gpa >= 3 ? 'text-xedu-slate-600' : 'text-xedu-amber-600'
                      )}>
                        {s.gpa?.toFixed(2) ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/dashboard/grades" className="flex items-center gap-1 text-xs font-semibold text-xedu-primary hover:underline pt-1">
                <ChevronRight className="h-3 w-3" />
                Batafsil baholar →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <BarChart3 className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Baholar ma'lumotlari mavjud emas</p>
              <Link href="/dashboard/grades" className="text-xs font-semibold text-xedu-primary hover:underline">
                Baholarga o'tish →
              </Link>
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
          <div className="flex flex-col items-center py-8 gap-2">
            <Clock className="h-6 w-6 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Faoliyat jurnali mavjud emas</p>
            <p className="text-xs text-xedu-slate-400">Bu funksiya keyinchalik qo&apos;shiladi</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <EntityPanel
      open={open}
      onClose={onClose}
      entityType="class"
      title={cls.name}
      subtitle={`${cls.gradeLevel}-sinf · ${cls.academicYear}`}
      status={cls.classTeacherId && (cls._count?.students ?? 0) > 0 ? 'active' : 'pending'}
      metrics={[
        { label: 'Daraja', value: `${cls.gradeLevel}-sinf`, tone: 'calm' },
        { label: "O'quvchilar", value: studentCount, tone: studentCount > 0 ? 'success' : 'attention' },
        { label: 'Fanlar', value: classSubjects.length, tone: classSubjects.length > 0 ? 'success' : 'attention' },
      ]}
      tabs={tabs}
    />
  );
}

