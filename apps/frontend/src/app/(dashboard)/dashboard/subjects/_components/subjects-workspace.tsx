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
import Link from 'next/link';

import {
  BookOpen, Plus, Users, GraduationCap, Loader2, Check, Trash2,
  Search, X, Filter, Eye, Edit3, ArrowRight, School, BarChart3,
  Calendar, Clock, Trophy, FileText, TrendingUp, AlertTriangle,
  MonitorPlay, BarChart2, MessageSquare,
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
import { OpTable } from '@/components/workspace-system/op-table';
import {
  PrimaryAction, SecondaryAction, IconAction, ActionBar,
} from '@/components/workspace-system/action-bar';
import { EntityPanel, EntityPanelProps } from '@/components/workspace-system/entity-panel';
import { FloatingBulkToolbar } from '@/components/director-workspace/floating-bulk-toolbar';

/* ═══════════════════════════════════════════════════════════════════════════════
   SUBJECTS WORKSPACE
   Institutional academic curriculum operations workspace.
   Curriculum-aware, teacher-linked, class-linked, assessment-linked.
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

const EMPTY_FORM = { name: '', classIds: [] as string[], teacherId: '' };

// ── Subject Entity Panel ──────────────────────────────────────────────────────

function SubjectPanel({ subject, open, onClose, canManage, onEdit }: {
  subject: Subject | null;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
  onEdit?: (s: Subject) => void;
}) {
  const router = useRouter();
  if (!subject) return null;

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-base font-bold text-xedu-slate-500">
              <BookOpen className="h-5 w-5 text-xedu-primary" />
            </div>
            <div>
              <p className="text-base font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{subject.name}</p>
              <p className="text-xs text-xedu-slate-500">{subject.class?.name ?? '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={School} label="Sinf" value={subject.class?.name ?? '—'} />
            <InfoItem icon={Users} label="O'qituvchi" value={subject.teacher ? `${subject.teacher.firstName} ${subject.teacher.lastName}` : '—'} />
            <InfoItem icon={Calendar} label="Yaratildi" value={formatDate(subject.createdAt)} />
            <InfoItem icon={Clock} label="ID" value={subject.id.slice(0, 8)} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {canManage && onEdit && (
              <PrimaryAction icon={<Edit3 className="h-3.5 w-3.5" />} onClick={() => onEdit(subject)}>
                Tahrirlash
              </PrimaryAction>
            )}
            <SecondaryAction icon={<Trophy className="h-3.5 w-3.5" />} onClick={() => router.push('/dashboard/exams')}>
              Imtihonlar
            </SecondaryAction>
            <SecondaryAction icon={<BarChart2 className="h-3.5 w-3.5" />} onClick={() => router.push('/dashboard/grades')}>
              Baholar
            </SecondaryAction>
            <SecondaryAction icon={<MonitorPlay className="h-3.5 w-3.5" />} onClick={() => router.push('/dashboard/schedule')}>
              Jadval
            </SecondaryAction>
          </div>
        </div>
      ),
    },
    {
      id: 'teacher',
      label: "O'qituvchi",
      content: (
        <div className="p-5">
          {subject.teacher ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-xedu-slate-100 flex items-center justify-center text-sm font-bold text-xedu-slate-500">
                  {getInitials(subject.teacher.firstName, subject.teacher.lastName)}
                </div>
                <div>
                  <p className="text-sm font-bold">{subject.teacher.firstName} {subject.teacher.lastName}</p>
                  <p className="text-xs text-xedu-slate-500">O'qituvchi</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryAction icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/messages?userId=${subject.teacherId}`; }}>
                  Xabar
                </SecondaryAction>
                <SecondaryAction icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { window.location.href = `/dashboard/users/${subject.teacherId}`; }}>
                  Profil
                </SecondaryAction>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <Users className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">O'qituvchi biriktirilmagan</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'class',
      label: 'Sinf',
      content: (
        <div className="p-5">
          {subject.class ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-xedu-slate-100 flex items-center justify-center text-sm font-bold text-xedu-slate-500">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">{subject.class.name}</p>
                  <p className="text-xs text-xedu-slate-500">Sinf</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryAction icon={<Eye className="h-3.5 w-3.5" />} onClick={() => router.push(`/dashboard/classes/${subject.classId}`)}>
                  Sinf sahifasi
                </SecondaryAction>
                <SecondaryAction icon={<MonitorPlay className="h-3.5 w-3.5" />} onClick={() => router.push('/dashboard/schedule')}>
                  Jadval
                </SecondaryAction>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <School className="h-6 w-6 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Sinf ma'lumoti yo'q</p>
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
      title={subject.name}
      subtitle={subject.class?.name ?? ''}
      status="active"
      metrics={[
        { label: 'Sinf', value: subject.class?.name ?? '—', tone: 'calm' },
        { label: "O'qituvchi", value: subject.teacher ? `${subject.teacher.firstName} ${subject.teacher.lastName}` : '—', tone: 'calm' },
        { label: 'Yaratildi', value: formatDate(subject.createdAt), tone: 'calm' },
      ]}
      tabs={tabs}
    />
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────




// ── Main Workspace ────────────────────────────────────────────────────────────

export function SubjectsWorkspace() {
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ask = useConfirm();

  const canManage = ['vice_principal', 'branch_admin'].includes(user?.role ?? '');
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

  // Unmount'da kutilayotgan debounce timeri tozalanadi
  useEffect(() => () => window.clearTimeout(searchTimerRef.current), []);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects', activeBranchId],
    queryFn: () => subjectsApi.getAll(undefined, activeBranchId ?? undefined),
  });

  const { data: catalog = [] } = useQuery({
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

  // ── Filtered subjects ────────────────────────────────────────────────────────
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const teacherName = s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}`.toLowerCase() : '';
        const className = s.class?.name?.toLowerCase() ?? '';
        if (!s.name.toLowerCase().includes(q) && !teacherName.includes(q) && !className.includes(q)) return false;
      }
      if (filterClass && s.classId !== filterClass) return false;
      if (filterTeacher && s.teacherId !== filterTeacher) return false;
      return true;
    });
  }, [subjects, debouncedSearch, filterClass, filterTeacher]);

  // ── Selection + Panel ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelSubject, setPanelSubject] = useState<Subject | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === filteredSubjects.length && filteredSubjects.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubjects.map((s) => s.id));
    }
  }, [selectedIds.length, filteredSubjects]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Create / Edit modal ──────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingSubject(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      classIds: subject.classId ? [subject.classId] : [],
      teacherId: subject.teacherId ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSubject(null);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof subjectsApi.update>[1] }) =>
      subjectsApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Fan yangilandi" });
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
      if (editingSubject) {
        // Mavjud yozuv birinchi tanlangan sinfga yangilanadi; qo'shimcha sinflar
        // uchun alohida yozuvlar yaratiladi (backend nom+sinf bo'yicha upsert qiladi)
        const [primaryClassId, ...extraClassIds] = form.classIds;
        await updateMutation.mutateAsync({
          id: editingSubject.id,
          payload: {
            name: form.name.trim(),
            teacherId: form.teacherId,
            classId: primaryClassId,
          } as any,
        });
        if (extraClassIds.length > 0) {
          try {
            await subjectsApi.create({
              name: form.name.trim(),
              classIds: extraClassIds,
              teacherId: form.teacherId,
            });
          } catch (err: any) {
            const msg = err?.response?.data?.message;
            toast({ variant: 'destructive', title: "Qo'shimcha sinflar saqlanmadi", description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
          }
          queryClient.invalidateQueries({ queryKey: ['subjects'] });
        }
      } else {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          classIds: form.classIds,
          teacherId: form.teacherId,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: subjectsApi.remove,
    onSuccess: () => {
      toast({ title: "Fan o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });

  // ── Active filter chips ──────────────────────────────────────────────────────
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

  // ── Intelligence ─────────────────────────────────────────────────────────────
  const totalSubjects = subjects.length;
  const uniqueSubjects = catalog.length;
  const subjectsWithoutTeacher = subjects.filter((s) => !s.teacherId).length;

  const teacherBreakdown = useMemo(() => {
    const map = new Map<string, { teacher: any; count: number }>();
    subjects.forEach((s) => {
      if (!s.teacher) return;
      const cur = map.get(s.teacherId) ?? { teacher: s.teacher, count: 0 };
      cur.count++;
      map.set(s.teacherId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [subjects]);

  const classBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    subjects.forEach((s) => {
      if (!s.class) return;
      const cur = map.get(s.classId) ?? { name: s.class.name, count: 0 };
      cur.count++;
      map.set(s.classId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [subjects]);

  const recentSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [subjects]);

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Fan',
      cell: (s: Subject) => (
        <div className="min-w-0">
          <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 text-xs truncate">{s.name}</p>
          <p className="text-2xs text-xedu-slate-400">{s.class?.name ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Sinf',
      width: '90px',
      cell: (s: Subject) => (
        <span className="text-xs text-xedu-slate-600">{s.class?.name ?? '—'}</span>
      ),
    },
    {
      key: 'teacher',
      header: "O'qituvchi",
      width: '120px',
      cell: (s: Subject) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="h-5 w-5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-2xs font-bold text-xedu-slate-500 shrink-0">
            {s.teacher?.firstName?.[0]}{s.teacher?.lastName?.[0]}
          </div>
          <span className="text-xs text-xedu-slate-600 truncate">
            {s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : <span className="text-xedu-amber-500">Biriktirilmagan</span>}
          </span>
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Yaratildi',
      width: '80px',
      cell: (s: Subject) => (
        <span className="text-xs text-xedu-slate-400">{formatDate(s.createdAt)}</span>
      ),
    },
  ], []);

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="Fanlar"
          subtitle={`${totalSubjects} ta fan · O'quv dasturi boshqaruvi`}
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

      {/* Main: Subjects table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={filteredSubjects}
          rowKey={(s) => s.id}
          density="compact"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          rowTone={(s) => {
            if (!s.teacherId) return 'attention';
            return 'neutral';
          }}
          rowActions={(s) => (
            <>
              <IconAction
                icon={<Eye className="h-3.5 w-3.5" />}
                title="Ko'rish"
                onClick={() => setPanelSubject(s)}
                tone="primary"
              />
              {canManage && (
                <IconAction
                  icon={<Edit3 className="h-3.5 w-3.5" />}
                  title="Tahrirlash"
                  onClick={() => openEdit(s)}
                />
              )}
              <IconAction
                icon={<School className="h-3.5 w-3.5" />}
                title="Sinf"
                onClick={() => router.push(`/dashboard/classes/${s.classId}`)}
              />
              <IconAction
                icon={<Trophy className="h-3.5 w-3.5" />}
                title="Imtihonlar"
                onClick={() => router.push('/dashboard/exams')}
              />
              {canDelete && (
                <IconAction
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  title="O'chirish"
                  tone="danger"
                  onClick={async () => {
                    if (await ask({ title: `"${s.name}" fanini o'chirishni tasdiqlaysizmi?`, variant: 'destructive', confirmText: "O'chirish" })) {
                      deleteMutation.mutate(s.id);
                    }
                  }}
                />
              )}
            </>
          )}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <BookOpen className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">Fanlar yo&apos;q</p>
              <p className="text-xs text-xedu-slate-400">
                {canManage ? "Yuqoridagi '+ Yangi fan' tugmasini bosib qo'shing" : "Sizga biriktirilgan fanlar bu yerda ko'rinadi"}
              </p>
            </div>
          }
        />
      </WorkspaceMain>

      {/* Right sidebar: Curriculum intelligence */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Umumiy ko'rsatkichlar" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={totalSubjects} />
            <StatPill label="Noyob fanlar" value={uniqueSubjects} />
            <StatPill label="O'qituvchilar" value={new Set(subjects.map(s => s.teacherId).filter(Boolean)).size} />
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

        {recentSubjects.length > 0 && (
          <WorkspaceSection title="So'ngi fanlar" icon={<TrendingUp className="h-4 w-4" />}>
            <div className="space-y-1">
              {recentSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPanelSubject(s)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-xedu-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">{s.name}</p>
                    <p className="text-2xs text-xedu-slate-400">{s.class?.name} · {formatDate(s.createdAt)}</p>
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

      {/* Subject Entity Panel */}
      <SubjectPanel
        subject={panelSubject}
        open={!!panelSubject}
        onClose={() => setPanelSubject(null)}
        canManage={canManage}
        onEdit={canManage ? openEdit : undefined}
      />

      {/* Bulk toolbar */}
      <FloatingBulkToolbar
        visible={selectedIds.length >= 1 && canManage}
        selectedIds={selectedIds}
        actions={[
          {
            id: 'delete',
            label: "O'chirish",
            icon: Trash2,
            tone: 'danger',
            onClick: async () => {
              if (!confirm(`${selectedIds.length} ta fanni o'chirishni tasdiqlaysizmi?`)) return;
              for (const id of selectedIds) {
                try { await subjectsApi.remove(id); } catch {}
              }
              toast({ title: `${selectedIds.length} ta fan o'chirildi` });
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
            <DialogTitle>{editingSubject ? 'Fanni tahrirlash' : "Yangi fan qo'shish"}</DialogTitle>
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
            <Button onClick={handleSubmit} disabled={saving || createMutation.isPending || updateMutation.isPending}>
              {(saving || createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSubject ? 'Saqlash' : "Qo'shish"} {form.classIds.length > 1 && !editingSubject ? `(${form.classIds.length} sinf)` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
