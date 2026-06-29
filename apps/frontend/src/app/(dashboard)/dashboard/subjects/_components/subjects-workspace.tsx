'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/store/confirm.store';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { subjectsApi } from '@/lib/api/subjects';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { formatDate, cn, getInitials } from '@/lib/utils';

import {
  BookOpen, Plus, Users, GraduationCap, Loader2, Check, Trash2,
  Search, X, Filter, Eye, Edit3, ArrowRight, School, BarChart3,
  Calendar, Clock, Trophy, FileText, TrendingUp, AlertTriangle,
  MonitorPlay, BarChart2, MessageSquare, ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import {
  WorkspaceShell, WorkspaceHeader, WorkspaceToolbar, WorkspaceMain, WorkspaceSidebar, WorkspaceSection,
  StatPill, QuickLink, InfoItem
} from '@/components/workspace-system';
import {
  PrimaryAction, SecondaryAction, IconAction, ActionBar,
} from '@/components/workspace-system/action-bar';
import { EntityPanel } from '@/components/workspace-system/entity-panel';
import { FloatingBulkToolbar } from '@/components/director-workspace/floating-bulk-toolbar';

/* ═══════════════════════════════════════════════════════════════════════════════
   SUBJECTS WORKSPACE
   Catalog-grouped view: bitta fan nomi = bitta qator, sinflar badge sifatida.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Subject {
  id: string;
  name: string;
  classId: string;
  teacherId: string;
  schoolId: string;
  branchId: string;
  createdAt: string;
  class?: { id: string; name: string };
  teacher?: { id: string; firstName: string; lastName: string };
}

interface CatalogItem {
  name: string;
  normalizedName: string;
  count: number;
  classes: { id: string; name: string }[];
  teachers: { id: string; firstName: string; lastName: string }[];
  subjectIds: string[];
  totalHoursPerWeek: number;
}

const EMPTY_FORM = { name: '', classIds: [] as string[], teacherId: '' };

// ── Catalog Item Panel ────────────────────────────────────────────────────────

function CatalogPanel({ item, open, onClose, canManage, onEdit, subjects }: {
  item: CatalogItem | null;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
  onEdit?: (item: CatalogItem) => void;
  subjects: Subject[];
}) {
  const router = useRouter();
  if (!item) return null;

  const perClassData = item.classes.map((cls) => {
    const subj = subjects.find(s => s.classId === cls.id && s.name.toLowerCase() === item.normalizedName);
    return { cls, teacher: subj?.teacher ?? null, subjectId: subj?.id };
  });

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-xedu-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-xedu-primary" />
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{item.name}</p>
              <p className="text-xs text-xedu-slate-500">{item.count} ta sinfda o'qitiladi</p>
            </div>
          </div>

          {/* Class assignments */}
          <div className="space-y-2">
            <p className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400">Sinflar va o'qituvchilar</p>
            <div className="space-y-1.5">
              {perClassData.map(({ cls, teacher }) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 bg-xedu-bg-subtle border border-xedu-border"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold bg-xedu-primary/10 text-xedu-primary">
                      {cls.name}
                    </span>
                    {teacher ? (
                      <span className="text-xs text-xedu-slate-600">
                        {teacher.firstName} {teacher.lastName}
                      </span>
                    ) : (
                      <span className="text-xs text-xedu-amber-500">O'qituvchi yo'q</span>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                    className="text-xedu-slate-400 hover:text-xedu-primary transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {canManage && onEdit && (
              <PrimaryAction icon={<Edit3 className="h-3.5 w-3.5" />} onClick={() => onEdit(item)}>
                Tahrirlash
              </PrimaryAction>
            )}
            <SecondaryAction icon={<Trophy className="h-3.5 w-3.5" />} onClick={() => router.push('/dashboard/exams')}>
              Imtihonlar
            </SecondaryAction>
            <SecondaryAction icon={<BarChart2 className="h-3.5 w-3.5" />} onClick={() => router.push('/dashboard/grades')}>
              Baholar
            </SecondaryAction>
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
      title={item.name}
      subtitle={`${item.count} ta sinfda`}
      status="active"
      metrics={[
        { label: 'Sinflar', value: item.count, tone: 'calm' },
        { label: "O'qituvchilar", value: item.teachers.length, tone: 'calm' },
      ]}
      tabs={tabs}
    />
  );
}

// ── Main Workspace ────────────────────────────────────────────────────────────

export function SubjectsWorkspace() {
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ask = useConfirm();

  const canManage = ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '');
  const canDelete = ['director'].includes(user?.role ?? '');
  const isDirector = user?.role === 'director';
  const isTeacher = ['teacher', 'class_teacher'].includes(user?.role ?? '');

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const searchTimerRef = useRef<number | undefined>(undefined);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => setDebouncedSearch(v), 300);
  }, []);

  useEffect(() => () => window.clearTimeout(searchTimerRef.current), []);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ['subjects', activeBranchId],
    queryFn: () => subjectsApi.getAll(undefined, activeBranchId ?? undefined),
  });

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ['subjects', 'catalog', activeBranchId],
    queryFn: () => subjectsApi.getCatalog(activeBranchId ?? undefined),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
    enabled: canManage,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 1, activeBranchId],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
    enabled: canManage,
  });

  const classes: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const teachers: any[] = (usersData?.data ?? []).filter((u: any) => ['teacher', 'class_teacher'].includes(u.role));
  const catalogItems = catalog as CatalogItem[];
  const isLoading = subjectsLoading || catalogLoading;

  // ── Filtered catalog ──────────────────────────────────────────────────────────
  const filteredCatalog = useMemo(() => {
    return catalogItems.filter((item) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const teacherMatch = item.teachers.some(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(q));
        const classMatch = item.classes.some(c => c.name.toLowerCase().includes(q));
        if (!item.name.toLowerCase().includes(q) && !teacherMatch && !classMatch) return false;
      }
      if (filterClass && !item.classes.some(c => c.id === filterClass)) return false;
      if (filterTeacher && !item.teachers.some(t => t.id === filterTeacher)) return false;
      return true;
    });
  }, [catalogItems, debouncedSearch, filterClass, filterTeacher]);

  // ── Selection + Panel ─────────────────────────────────────────────────────────
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [panelItem, setPanelItem] = useState<CatalogItem | null>(null);

  const toggleSelect = useCallback((normalizedName: string) => {
    setSelectedNames((prev) => prev.includes(normalizedName) ? prev.filter((x) => x !== normalizedName) : [...prev, normalizedName]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedNames.length === filteredCatalog.length && filteredCatalog.length > 0) {
      setSelectedNames([]);
    } else {
      setSelectedNames(filteredCatalog.map((i) => i.normalizedName));
    }
  }, [selectedNames.length, filteredCatalog]);

  const clearSelection = useCallback(() => setSelectedNames([]), []);

  // ── Create / Edit modal ───────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      classIds: item.classes.map(c => c.id),
      teacherId: item.teachers[0]?.id ?? '',
    });
    setErrors({});
    setModalOpen(true);
    setPanelItem(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const toggleClass = (id: string) => {
    setForm(f => ({
      ...f,
      classIds: f.classIds.includes(id) ? f.classIds.filter(c => c !== id) : [...f.classIds, id],
    }));
    setErrors(e => { const n = { ...e }; delete n.classIds; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Fan nomi kiritilishi shart';
    if (form.classIds.length === 0) e.classIds = 'Kamida 1 ta sinf tanlang';
    if (!form.teacherId) e.teacherId = "O'qituvchi tanlang";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => {
      toast({ title: "Fan qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      closeModal();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingItem) {
        const oldClassIds = editingItem.classes.map(c => c.id);
        const newClassIds = form.classIds;
        const removedClassIds = oldClassIds.filter(id => !newClassIds.includes(id));

        // Upsert all selected classes (backend handles create/update)
        await subjectsApi.create({
          name: form.name.trim(),
          classIds: newClassIds,
          teacherId: form.teacherId,
        });

        // Delete assignments for removed classes
        for (const classId of removedClassIds) {
          const subj = (subjects as Subject[]).find(
            s => s.classId === classId && s.name.toLowerCase() === editingItem.normalizedName
          );
          if (subj) {
            try { await subjectsApi.remove(subj.id); } catch {}
          }
        }

        toast({ title: 'Fan yangilandi' });
        queryClient.invalidateQueries({ queryKey: ['subjects'] });
        closeModal();
      } else {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          classIds: form.classIds,
          teacherId: form.teacherId,
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCatalogItem = async (item: CatalogItem) => {
    const confirmed = await ask({
      title: `"${item.name}" fanini o'chirishni tasdiqlaysizmi?`,
      description: `Bu fan ${item.count} ta sinfdan (${item.classes.map(c => c.name).join(', ')}) o'chiriladi.`,
      variant: 'destructive',
      confirmText: "O'chirish",
    });
    if (!confirmed) return;
    for (const id of item.subjectIds) {
      try { await subjectsApi.remove(id); } catch {}
    }
    toast({ title: "Fan o'chirildi" });
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
  };

  // ── Active filter chips ───────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterClass) {
      const c = classes.find((x: any) => x.id === filterClass);
      chips.push({ key: 'class', label: c?.name ?? 'Sinf', onClear: () => setFilterClass('') });
    }
    if (filterTeacher) {
      const t = teachers.find((x: any) => x.id === filterTeacher);
      chips.push({ key: 'teacher', label: t ? `${t.firstName} ${t.lastName}` : "O'qituvchi", onClear: () => setFilterTeacher('') });
    }
    return chips;
  }, [filterClass, filterTeacher, classes, teachers]);

  // ── Intelligence ──────────────────────────────────────────────────────────────
  const totalSubjects = (subjects as Subject[]).length;
  const uniqueSubjects = catalogItems.length;
  const subjectsWithoutTeacher = (subjects as Subject[]).filter((s) => !s.teacherId).length;

  const teacherBreakdown = useMemo(() => {
    const map = new Map<string, { teacher: any; count: number }>();
    (subjects as Subject[]).forEach((s) => {
      if (!s.teacher) return;
      const cur = map.get(s.teacherId) ?? { teacher: s.teacher, count: 0 };
      cur.count++;
      map.set(s.teacherId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [subjects]);

  const classBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    (subjects as Subject[]).forEach((s) => {
      if (!s.class) return;
      const cur = map.get(s.classId) ?? { name: s.class.name, count: 0 };
      cur.count++;
      map.set(s.classId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [subjects]);

  const recentCatalog = useMemo(() => catalogItems.slice(0, 5), [catalogItems]);

  // ── Grouped table row ─────────────────────────────────────────────────────────
  const allSelected = filteredCatalog.length > 0 && selectedNames.length === filteredCatalog.length;
  const someSelected = selectedNames.length > 0 && !allSelected;

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="Fanlar"
          subtitle={`${uniqueSubjects} ta noyob fan · ${totalSubjects} ta biriktirish`}
          icon={<BookOpen className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            canManage && (
              <ActionBar
                primary={
                  <PrimaryAction onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                    Yangi fan
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
              placeholder="Fan, o'qituvchi, sinf..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-800 dark:text-xedu-slate-200 outline-none focus:ring-1 focus:ring-xedu-primary"
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
              onClick={() => { setFilterClass(''); setFilterTeacher(''); }}
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
              onChange={(e) => setFilterClass(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha sinflar</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs text-xedu-slate-700"
            >
              <option value="">Barcha o'qituvchilar</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main: Catalog table */}
      <WorkspaceMain>
        <div className="rounded-xl border border-xedu-border overflow-hidden bg-xedu-bg-elevated">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-3 py-2 border-b border-xedu-border bg-xedu-bg-subtle">
            {canManage && canDelete && (
              <Checkbox
                checked={allSelected}
                onCheckedChange={selectAll}
                className="h-3.5 w-3.5"
                aria-label="Hammasini tanlash"
              />
            )}
            <span className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400">Fan</span>
            <span className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 min-w-[120px]">Sinflar</span>
            <span className="text-2xs font-bold uppercase tracking-wider text-xedu-slate-400 min-w-[130px] hidden sm:block">O'qituvchi</span>
            <span className="w-16" />
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="divide-y divide-xedu-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-3 py-3">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                  <div className="flex gap-1 min-w-[120px]">
                    <Skeleton className="h-5 w-8 rounded-md" />
                    <Skeleton className="h-5 w-8 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-24 rounded hidden sm:block" />
                  <Skeleton className="h-6 w-16 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredCatalog.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <BookOpen className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">Fanlar yo&apos;q</p>
              <p className="text-xs text-xedu-slate-400">
                {debouncedSearch || filterClass || filterTeacher
                  ? 'Filterlarni tozalab ko\'ring'
                  : canManage
                    ? "Yuqoridagi '+ Yangi fan' tugmasini bosib qo'shing"
                    : 'Sizga biriktirilgan fanlar bu yerda ko\'rinadi'}
              </p>
              {(debouncedSearch || filterClass || filterTeacher) && (
                <Button size="sm" variant="outline" className="mt-1" onClick={() => { setSearch(''); setDebouncedSearch(''); setFilterClass(''); setFilterTeacher(''); }}>
                  Filterlarni tozalash
                </Button>
              )}
            </div>
          )}

          {/* Catalog rows */}
          {!isLoading && filteredCatalog.length > 0 && (
            <div className="divide-y divide-xedu-border">
              {filteredCatalog.map((item) => {
                const isSelected = selectedNames.includes(item.normalizedName);
                const primaryTeacher = item.teachers[0];
                const extraTeachers = item.teachers.length - 1;

                return (
                  <div
                    key={item.normalizedName}
                    className={cn(
                      'group grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-xedu-primary/5'
                        : 'hover:bg-xedu-bg-subtle',
                    )}
                    onClick={() => setPanelItem(item)}
                  >
                    {/* Checkbox */}
                    {canManage && canDelete ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(e) => {
                          (e as MouseEvent | React.MouseEvent).stopPropagation?.();
                          toggleSelect(item.normalizedName);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5"
                      />
                    ) : (
                      <span className="w-3.5" />
                    )}

                    {/* Fan nomi */}
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-xedu-slate-900 dark:text-xedu-slate-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-2xs text-xedu-slate-400">{item.count} ta sinf</p>
                    </div>

                    {/* Sinflar — class badges */}
                    <div className="flex flex-wrap gap-1 min-w-[120px] max-w-[200px]">
                      {item.classes.slice(0, 5).map((cls) => (
                        <span
                          key={cls.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-bold bg-xedu-primary/10 text-xedu-primary border border-xedu-primary/20"
                        >
                          {cls.name}
                        </span>
                      ))}
                      {item.classes.length > 5 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-semibold bg-xedu-slate-100 text-xedu-slate-500">
                          +{item.classes.length - 5}
                        </span>
                      )}
                    </div>

                    {/* O'qituvchi */}
                    <div className="min-w-[130px] hidden sm:flex items-center gap-1.5">
                      {item.teachers.length === 0 ? (
                        <span className="text-xs text-xedu-amber-500">Biriktirilmagan</span>
                      ) : (
                        <>
                          <div className="h-5 w-5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-2xs font-bold text-xedu-slate-500 shrink-0">
                            {primaryTeacher?.firstName?.[0]}{primaryTeacher?.lastName?.[0]}
                          </div>
                          <span className="text-xs text-xedu-slate-600 truncate max-w-[100px]">
                            {primaryTeacher?.firstName} {primaryTeacher?.lastName}
                          </span>
                          {extraTeachers > 0 && (
                            <span className="text-2xs text-xedu-slate-400">+{extraTeachers}</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Row actions */}
                    <div
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconAction
                        icon={<Eye className="h-3.5 w-3.5" />}
                        title="Ko'rish"
                        onClick={() => setPanelItem(item)}
                        tone="primary"
                      />
                      {canManage && (
                        <IconAction
                          icon={<Edit3 className="h-3.5 w-3.5" />}
                          title="Tahrirlash"
                          onClick={() => openEdit(item)}
                        />
                      )}
                      {canDelete && (
                        <IconAction
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          title="O'chirish"
                          tone="danger"
                          onClick={() => deleteCatalogItem(item)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer count */}
          {!isLoading && filteredCatalog.length > 0 && (
            <div className="px-3 py-2 border-t border-xedu-border bg-xedu-bg-subtle">
              <p className="text-2xs text-xedu-slate-400">
                {filteredCatalog.length} ta fan · {filteredCatalog.reduce((sum, i) => sum + i.count, 0)} ta sinf biriktirilishi
              </p>
            </div>
          )}
        </div>
      </WorkspaceMain>

      {/* Right sidebar */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Umumiy ko'rsatkichlar" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={totalSubjects} />
            <StatPill label="Noyob fanlar" value={uniqueSubjects} />
            <StatPill label="O'qituvchilar" value={new Set((subjects as Subject[]).map(s => s.teacherId).filter(Boolean)).size} />
            <StatPill label="Biriktirilmagan" value={subjectsWithoutTeacher} tone={subjectsWithoutTeacher > 0 ? 'urgent' : 'calm'} />
          </div>
        </WorkspaceSection>

        {teacherBreakdown.length > 0 && (
          <WorkspaceSection title="O'qituvchilar bo'yicha" icon={<Users className="h-4 w-4" />}>
            <div className="space-y-1">
              {teacherBreakdown.map((t) => (
                <button
                  key={t.teacher.id}
                  onClick={() => setFilterTeacher(t.teacher.id)}
                  className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <span className="text-xs font-medium text-xedu-slate-700 truncate">{t.teacher.firstName} {t.teacher.lastName}</span>
                  <span className="text-2xs font-bold tabular-nums text-xedu-slate-500">{t.count}</span>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {classBreakdown.length > 0 && (
          <WorkspaceSection title="Sinflar bo'yicha" icon={<School className="h-4 w-4" />}>
            <div className="space-y-1">
              {classBreakdown.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    const cls = classes.find((x: any) => x.name === c.name);
                    if (cls) setFilterClass(cls.id);
                  }}
                  className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <span className="text-xs font-medium text-xedu-slate-700 truncate">{c.name}</span>
                  <span className="text-2xs font-bold tabular-nums text-xedu-slate-500">{c.count}</span>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {recentCatalog.length > 0 && (
          <WorkspaceSection title="Fanlar" icon={<TrendingUp className="h-4 w-4" />}>
            <div className="space-y-1">
              {recentCatalog.map((item) => (
                <button
                  key={item.normalizedName}
                  onClick={() => setPanelItem(item)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-xedu-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">{item.name}</p>
                    <p className="text-2xs text-xedu-slate-400">{item.classes.map(c => c.name).join(', ')}</p>
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/classes" icon={School} label="Sinflar" />
            <QuickLink href="/dashboard/staff" icon={Users} label="Xodimlar" />
            <QuickLink href="/dashboard/schedule" icon={Calendar} label="Jadval" />
            <QuickLink href="/dashboard/exams" icon={Trophy} label="Imtihonlar" />
            <QuickLink href="/dashboard/grades" icon={BarChart2} label="Baholar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Catalog Item Panel */}
      <CatalogPanel
        item={panelItem}
        open={!!panelItem}
        onClose={() => setPanelItem(null)}
        canManage={canManage}
        onEdit={canManage ? openEdit : undefined}
        subjects={subjects as Subject[]}
      />

      {/* Bulk toolbar */}
      <FloatingBulkToolbar
        visible={selectedNames.length >= 1 && canDelete}
        selectedIds={selectedNames}
        actions={[
          {
            id: 'delete',
            label: "O'chirish",
            icon: Trash2,
            tone: 'danger',
            onClick: async () => {
              const selected = catalogItems.filter(i => selectedNames.includes(i.normalizedName));
              const totalCount = selected.reduce((sum, i) => sum + i.count, 0);
              if (!confirm(`${selectedNames.length} ta fan (${totalCount} ta biriktirish) o'chirilsinmi?`)) return;
              for (const item of selected) {
                for (const id of item.subjectIds) {
                  try { await subjectsApi.remove(id); } catch {}
                }
              }
              toast({ title: `${selectedNames.length} ta fan o'chirildi` });
              queryClient.invalidateQueries({ queryKey: ['subjects'] });
              clearSelection();
            },
          },
        ]}
        onClear={clearSelection}
      />

      {/* Create / Edit dialog */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeModal(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Fanni tahrirlash' : "Yangi fan qo'shish"}</DialogTitle>
            <DialogDescription>Fan bir yoki bir nechta sinfga biriktiriladi</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Fan nomi <span className="text-xedu-ruby">*</span></Label>
              <Input
                placeholder="Masalan: Matematika"
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => { const n = { ...er }; delete n.name; return n; }); }}
              />
              {errors.name && <p className="text-xs text-xedu-ruby">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Sinflar <span className="text-xedu-ruby">*</span></Label>
              {classes.length === 0 ? (
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 italic">Sinflar yuklanmoqda...</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {classes.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent cursor-pointer text-sm">
                      <Checkbox
                        checked={form.classIds.includes(c.id)}
                        onCheckedChange={() => toggleClass(c.id)}
                      />
                      <span>{c.name}</span>
                      {form.classIds.includes(c.id) && <Check className="h-3 w-3 text-primary ml-auto" />}
                    </label>
                  ))}
                </div>
              )}
              {form.classIds.length > 0 && (
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{form.classIds.length} ta sinf tanlandi</p>
              )}
              {errors.classIds && <p className="text-xs text-xedu-ruby">{errors.classIds}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>O'qituvchi <span className="text-xedu-ruby">*</span></Label>
              <Select value={form.teacherId} onValueChange={v => { setForm(f => ({ ...f, teacherId: v })); setErrors(e => { const n = { ...e }; delete n.teacherId; return n; }); }}>
                <SelectTrigger><SelectValue placeholder="O'qituvchi tanlang..." /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.teacherId && <p className="text-xs text-xedu-ruby">{errors.teacherId}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={saving || createMutation.isPending}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? 'Saqlash' : "Qo'shish"} {form.classIds.length > 1 ? `(${form.classIds.length} sinf)` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
