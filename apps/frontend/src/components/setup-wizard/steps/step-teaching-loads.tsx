'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Trash2, AlertCircle, ArrowRight, Loader2,
  Upload, CheckCircle2, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { teachingLoadApi } from '@/lib/api/teaching-load';
import { usersApi } from '@/lib/api/users';
import { subjectsApi } from '@/lib/api/subjects';
import { classesApi } from '@/lib/api/classes';
import { cn } from '@/lib/utils';

interface StepTeachingLoadsProps {
  onDone: () => void;
}

export function StepTeachingLoads({ onDone }: StepTeachingLoadsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({
    teacherId: '',
    subjectId: '',
    classId: '',
    hoursPerWeek: '',
  });

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['teaching-loads'],
    queryFn: () => teachingLoadApi.getAll({ status: 'approved' }),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['users', 'teachers'],
    queryFn: () => usersApi.getAll({ limit: 100 }),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const teachers = teachersData?.data?.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)) ?? [];

  const createMut = useMutation({
    mutationFn: teachingLoadApi.create,
    onSuccess: () => {
      toast({ title: "O'qituvchi yuklamasi qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      setForm({ teacherId: '', subjectId: '', classId: '', hoursPerWeek: '' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Xato' }),
  });

  const removeMut = useMutation({
    mutationFn: teachingLoadApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teaching-loads'] }),
  });

  const hasLoads = loads.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-xedu-sky/5 border border-xedu-sky/10 p-3 text-xs text-xedu-sky flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          O&apos;qituvchi yuklamalari (Teaching Load) dars jadvali generatorining asosiy manbai hisoblanadi.
          Har bir o&apos;qituvchiga qaysi fandan, qaysi sinfda, haftada necha soat dars berishini belgilang.
        </p>
      </div>

      {/* Manual add */}
      <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 p-3 space-y-2">
        <p className="text-xs font-medium text-xedu-slate-700 dark:text-xedu-slate-200">Qo&apos;lda qo&apos;shish</p>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-9 rounded-md border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-950 px-2 text-xs"
            value={form.teacherId}
            onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))}
          >
            <option value="">O&apos;qituvchi</option>
            {teachers.map((t: any) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-950 px-2 text-xs"
            value={form.subjectId}
            onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
          >
            <option value="">Fan</option>
            {subjects.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-950 px-2 text-xs"
            value={form.classId}
            onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}
          >
            <option value="">Sinf</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Input
            placeholder="Soat/hafta"
            type="number"
            value={form.hoursPerWeek}
            onChange={(e) => setForm((p) => ({ ...p, hoursPerWeek: e.target.value }))}
            className="h-9 text-xs"
          />
        </div>
        <Button
          className="w-full"
          size="sm"
          onClick={() =>
            createMut.mutate({
              teacherId: form.teacherId,
              subjectId: form.subjectId,
              classId: form.classId,
              hoursPerWeek: Number(form.hoursPerWeek) || 1,
            })
          }
          disabled={!form.teacherId || !form.subjectId || !form.classId || !form.hoursPerWeek || createMut.isPending}
        >
          {createMut.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
          Yuklama qo&apos;shish
        </Button>
      </div>

      {/* Import option */}
      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowImport((p) => !p)}>
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        {showImport ? 'Importni yashirish' : "Exceldan import qilish (tez ko'rish)"}
      </Button>

      {showImport && (
        <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 p-3 text-xs text-xedu-slate-500 space-y-2">
          <p className="font-medium text-xedu-slate-700">Import qilish uchun:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li><code className="bg-xedu-slate-100 dark:bg-xedu-slate-800 px-1 rounded">O&apos;qituvchilar &gt; Yuklamalar &gt; Import</code> sahifasiga o&apos;ting</li>
            <li>Excel shablonini yuklab oling</li>
            <li>Ma&apos;lumotlarni to&apos;ldiring va faylni yuklang</li>
            <li>Tekshiruvdan o&apos;tkazib, saqlang</li>
          </ol>
          <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => { window.open('/dashboard/teaching-loads', '_blank'); }}>
            Import sahifasiga o&apos;tish →
          </Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : loads.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="O'qituvchi yuklamalari yo'q"
          description="Yuqoridagi shakl orqali qo'shing yoki import qiling."
        />
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {loads.map((load: any) => (
            <div
              key={load.id}
              className="flex items-center gap-2 rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 p-2.5 text-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-xedu-emerald shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {load.teacher?.firstName} {load.teacher?.lastName}
                </p>
                <p className="text-xs text-xedu-slate-500">
                  {load.subject?.name} • {load.class?.name} • {load.hoursPerWeek} soat/hafta
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-xedu-ruby" onClick={() => removeMut.mutate(load.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!hasLoads && (
        <div className="rounded-xl bg-xedu-amber/5 border border-xedu-amber/10 p-3 text-xs text-xedu-amber flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Kamida 1 ta tasdiqlangan o&apos;qituvchi yuklamasi kerak.</p>
        </div>
      )}

      <Button className="w-full" onClick={onDone} disabled={!hasLoads}>
        {hasLoads ? 'Davom etish' : 'Yuklama qo\'shing'}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
