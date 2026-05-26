'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { useConfirm } from '@/store/confirm.store';
import { cn } from '@/lib/utils';
import {
  BookOpen, Plus, Search, Upload, Trash2, Edit3, Loader2, AlertTriangle,
  CheckCircle2, XCircle, Filter, GraduationCap, Users, School,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StandardEmptyState } from '@/components/ui/standard-empty-state';

import { teachingLoadApi, type TeachingLoad, type ImportPreviewRow } from '@/lib/api/teaching-load';
import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Qoralama', variant: 'secondary' },
  approved: { label: 'Tasdiqlangan', variant: 'default' },
  archived: { label: 'Arxiv', variant: 'outline' },
};

const SEMESTER_OPTIONS = [
  { value: 'full_year', label: 'Yillik' },
  { value: 'first', label: '1-semestr' },
  { value: 'second', label: '2-semestr' },
];

const GROUP_TYPE_OPTIONS = [
  { value: 'class', label: 'Sinf' },
  { value: 'group', label: 'Guruh' },
  { value: 'elective', label: 'Tanlov' },
  { value: 'club', label: "To'garak" },
];

export default function TeachingLoadsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const ask = useConfirm();
  const isManager = user?.role === 'director' || user?.role === 'vice_principal' || user?.role === 'branch_admin';
  const isTeacher = user?.role === 'teacher' || user?.role === 'class_teacher';

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [teacherFilter, setTeacherFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[] | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Form state
  const [form, setForm] = useState({
    teacherId: '', subjectId: '', classId: '',
    hoursPerWeek: 2, hoursPerYear: undefined as number | undefined,
    semester: 'full_year', groupType: 'class',
    isSplitClass: false, coefficient: 1, notes: '', status: 'draft' as string,
  });

  const { data: loads, isLoading } = useQuery({
    queryKey: ['teaching-loads', { status: statusFilter, teacherId: teacherFilter, classId: classFilter }],
    queryFn: () => teachingLoadApi.getAll({
      status: statusFilter || undefined,
      teacherId: isTeacher ? user?.id : (teacherFilter || undefined),
      classId: classFilter || undefined,
    }),
  });

  const { data: teachers } = useQuery({
    queryKey: ['users', 'teachers'],
    queryFn: () => usersApi.getAll({ role: 'teacher', limit: 500 }),
    enabled: isManager,
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.getAll(),
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: teachingLoadApi.create,
    onSuccess: () => {
      toast({ title: "O'quv yuklamasi yaratildi" });
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => teachingLoadApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Yangilandi" });
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      setEditOpen(false);
      setEditId(null);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teachingLoadApi.remove,
    onSuccess: () => {
      toast({ title: "Arxivlandi" });
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const importPreviewMutation = useMutation({
    mutationFn: (file: File) => teachingLoadApi.importPreview(file),
    onSuccess: (data) => {
      setImportPreview(data.rows);
      toast({ title: `Jami: ${data.total}, To'g'ri: ${data.valid}, Xato: ${data.invalid}` });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Import xatosi', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const importCommitMutation = useMutation({
    mutationFn: (rows: ImportPreviewRow[]) => teachingLoadApi.importCommit(rows),
    onSuccess: (data) => {
      toast({ title: `${data.created} ta yaratildi` });
      if (data.errors.length > 0) {
        toast({ variant: 'destructive', title: 'Ba\'zi qatorlar saqlanmadi', description: data.errors.join('; ') });
      }
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      setImportOpen(false);
      setImportPreview(null);
      setImportFile(null);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Saqlashda xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  function resetForm() {
    setForm({
      teacherId: '', subjectId: '', classId: '',
      hoursPerWeek: 2, hoursPerYear: undefined,
      semester: 'full_year', groupType: 'class',
      isSplitClass: false, coefficient: 1, notes: '', status: 'draft',
    });
  }

  function openEdit(load: TeachingLoad) {
    setEditId(load.id);
    setForm({
      teacherId: load.teacherId,
      subjectId: load.subjectId,
      classId: load.classId,
      hoursPerWeek: load.hoursPerWeek,
      hoursPerYear: load.hoursPerYear,
      semester: load.semester ?? 'full_year',
      groupType: load.groupType ?? 'class',
      isSplitClass: load.isSplitClass,
      coefficient: load.coefficient,
      notes: load.notes ?? '',
      status: load.status,
    });
    setEditOpen(true);
  }

  async function handleDelete(id: string) {
    const ok = await ask({
      title: 'Arxivlashni tasdiqlang',
      description: "Bu o'quv yuklamasini arxivlashni xohlaysizmi?",
      confirmText: 'Arxivlash',
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(id);
  }

  const filteredLoads = useMemo(() => {
    if (!loads) return [];
    const term = search.toLowerCase();
    return loads.filter((l: TeachingLoad) => {
      if (!term) return true;
      const teacherName = `${l.teacher?.firstName ?? ''} ${l.teacher?.lastName ?? ''}`.toLowerCase();
      const subjectName = l.subject?.name?.toLowerCase() ?? '';
      const className = l.class?.name?.toLowerCase() ?? '';
      return teacherName.includes(term) || subjectName.includes(term) || className.includes(term);
    });
  }, [loads, search]);

  const totalHours = useMemo(() => {
    return filteredLoads.reduce((sum: number, l: TeachingLoad) => sum + (l.hoursPerWeek ?? 0), 0);
  }, [filteredLoads]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      importPreviewMutation.mutate(file);
    }
  };

  const teacherOptions = teachers?.data ?? [];
  const classOptions = classes ?? [];
  const subjectOptions = subjects ?? [];
  const router = useRouter();

  const prerequisitesLoaded = !isLoading && classes !== undefined && subjects !== undefined && teachers !== undefined;
  const missingPrerequisites = prerequisitesLoaded && (classOptions.length === 0 || subjectOptions.length === 0 || teacherOptions.length === 0);

  if (missingPrerequisites) {
    const missingItems = [
      classOptions.length === 0 && 'sinflar',
      subjectOptions.length === 0 && 'fanlar',
      teacherOptions.length === 0 && "o'qituvchilar",
    ].filter(Boolean);
    return (
      <div className="max-w-2xl mx-auto pt-10">
        <h1 className="text-xl font-bold text-foreground mb-1">O'quv yuklamalari</h1>
        <StandardEmptyState
          icon={GraduationCap}
          title="Ma'lumotlar yetishmayapti"
          description={`O'qituvchi yuklamasi qo'shish uchun avval ${missingItems.join(', ')} kerak. Maktab sozlash orqali tezda barcha ma'lumotlarni qo'shishingiz mumkin.`}
          primaryAction={{
            label: 'Maktabni sozlash',
            onClick: () => router.push('/dashboard/setup'),
          }}
          secondaryAction={{
            label: 'Sinflarni ko\'rish',
            onClick: () => router.push('/dashboard/classes'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">O'quv yuklamalari</h1>
        <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">Tarifikatsiya — o'qituvchilar va fanlar bo'yicha soatlar</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Jami yuklamalar</p>
          <p className="text-lg font-bold">{loads?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Jami soat/hafta</p>
          <p className="text-lg font-bold">{totalHours}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Barcha statuslar</SelectItem>
            <SelectItem value="draft">Qoralama</SelectItem>
            <SelectItem value="approved">Tasdiqlangan</SelectItem>
            <SelectItem value="archived">Arxiv</SelectItem>
          </SelectContent>
        </Select>
        {isManager && (
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="O'qituvchi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Barcha o'qituvchilar</SelectItem>
              {teacherOptions.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sinf" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Barcha sinflar</SelectItem>
            {classOptions.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isManager && (
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Yangi
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">O'qituvchi</th>
                <th className="px-4 py-3 text-left font-medium">Fan</th>
                <th className="px-4 py-3 text-left font-medium">Sinf</th>
                <th className="px-4 py-3 text-center font-medium">Soat/hafta</th>
                <th className="px-4 py-3 text-center font-medium">Semestr</th>
                <th className="px-4 py-3 text-center font-medium">Guruh</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                {isManager && <th className="px-4 py-3 text-right font-medium">Amallar</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={isManager ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">Yuklanmoqda...</td></tr>
              ) : filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 8 : 7} className="px-4 py-4">
                    <StandardEmptyState
                      icon={BookOpen}
                      title="O'quv yuklamalari yo'q"
                      description="Yangi o'quv yuklamasi qo'shish uchun yuqoridagi tugmani bosing."
                      primaryAction={isManager ? {
                        label: "Yuklama qo'shish",
                        onClick: () => { resetForm(); setCreateOpen(true); },
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load: TeachingLoad) => {
                  const statusMeta = STATUS_LABELS[load.status] ?? { label: load.status, variant: 'outline' as const };
                  return (
                    <tr key={load.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">{load.teacher?.firstName} {load.teacher?.lastName}</td>
                      <td className="px-4 py-3">{load.subject?.name}</td>
                      <td className="px-4 py-3">{load.class?.name}</td>
                      <td className="px-4 py-3 text-center font-semibold">{load.hoursPerWeek}</td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {SEMESTER_OPTIONS.find(s => s.value === load.semester)?.label ?? load.semester}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {GROUP_TYPE_OPTIONS.find(g => g.value === load.groupType)?.label ?? load.groupType}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </td>
                      {isManager && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(load)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(load.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi o'quv yuklamasi</DialogTitle>
            <DialogDescription>Fan, sinf va o'qituvchi bo'yicha soat kiriting</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>O'qituvchi</Label>
                <Select value={form.teacherId} onValueChange={(v) => setForm({ ...form, teacherId: v })}>
                  <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    {teacherOptions.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sinf</Label>
                <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    {classOptions.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fan</Label>
              <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Soat/hafta</Label>
                <Input type="number" min={1} max={40} value={form.hoursPerWeek} onChange={(e) => setForm({ ...form, hoursPerWeek: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label>Semestr</Label>
                <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEMESTER_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Guruh turi</Label>
                <Select value={form.groupType} onValueChange={(v) => setForm({ ...form, groupType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROUP_TYPE_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Izoh</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ixtiyoriy" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.teacherId || !form.subjectId || !form.classId || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>O'quv yuklamasini tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Soat/hafta</Label>
                <Input type="number" min={1} max={40} value={form.hoursPerWeek} onChange={(e) => setForm({ ...form, hoursPerWeek: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status ?? 'draft'} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Qoralama</SelectItem>
                    <SelectItem value="approved">Tasdiqlangan</SelectItem>
                    <SelectItem value="archived">Arxiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Izoh</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => editId && updateMutation.mutate({ id: editId, payload: { hoursPerWeek: form.hoursPerWeek, notes: form.notes, status: form.status } })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Excel import</DialogTitle>
            <DialogDescription>Excel faylni yuklang va tekshiring</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
            {importPreview && (
              <ScrollArea className="h-[400px] rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left">Qator</th>
                      <th className="px-3 py-2 text-left">O'qituvchi</th>
                      <th className="px-3 py-2 text-left">Fan</th>
                      <th className="px-3 py-2 text-left">Sinf</th>
                      <th className="px-3 py-2 text-center">Soat</th>
                      <th className="px-3 py-2 text-left">Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row) => (
                      <tr key={row.row} className={cn('border-b', row.valid ? '' : 'bg-red-50/50')}>
                        <td className="px-3 py-2">{row.row}</td>
                        <td className="px-3 py-2">{row.teacherEmail ?? row.teacherId ?? '-'}</td>
                        <td className="px-3 py-2">{row.subjectName ?? row.subjectId ?? '-'}</td>
                        <td className="px-3 py-2">{row.className ?? row.classId ?? '-'}</td>
                        <td className="px-3 py-2 text-center">{row.hoursPerWeek ?? '-'}</td>
                        <td className="px-3 py-2">
                          {row.valid ? (
                            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" /> {row.errors.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportPreview(null); setImportFile(null); }}>Bekor qilish</Button>
            <Button
              onClick={() => importPreview && importCommitMutation.mutate(importPreview.filter(r => r.valid))}
              disabled={!importPreview || importPreview.filter(r => r.valid).length === 0 || importCommitMutation.isPending}
            >
              {importCommitMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {importPreview ? `Saqlash (${importPreview.filter(r => r.valid).length})` : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
