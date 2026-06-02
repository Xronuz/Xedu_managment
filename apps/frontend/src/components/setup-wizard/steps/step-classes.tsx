'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Trash2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { classesApi } from '@/lib/api/classes';
import { MAX_GRADE } from '@eduplatform/types';
import { cn } from '@/lib/utils';

interface StepClassesProps {
  onDone: () => void;
}

const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'V', 'G'];

export function StepClasses({ onDone }: StepClassesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkLetters, setBulkLetters] = useState<string[]>(['A', 'B']);

  const { data: existingClasses = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const createMut = useMutation({
    mutationFn: (payload: { name: string; gradeLevel?: number; academicYear: string }) => classesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Xato' }),
  });

  const removeMut = useMutation({
    mutationFn: classesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });

  const createBulk = async () => {
    const grade = Number(bulkGrade);
    if (!grade || grade < 1 || grade > MAX_GRADE) {
      toast({ variant: 'destructive', title: `Sinif darajasi 1-${MAX_GRADE} orasida bo'lishi kerak` });
      return;
    }
    let created = 0;
    for (const letter of bulkLetters) {
      try {
        await createMut.mutateAsync({ name: `${grade}${letter}`, gradeLevel: grade, academicYear });
        created++;
      } catch {}
    }
    if (created > 0) toast({ title: `${created} ta sinf yaratildi` });
  };

  const toggleLetter = (letter: string) => {
    setBulkLetters((prev) =>
      prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter]
    );
  };

  const hasClasses = existingClasses.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
        Maktabdagi sinflarni yarating. Kamida 1 ta sinf kerak.
      </p>

      <div className="text-xs text-xedu-slate-500">
        O&apos;quv yili: <span className="font-medium">{academicYear}</span>
      </div>

      {/* Bulk create */}
      <div className="rounded-xl border-2 border-xedu-slate-200 dark:border-xedu-slate-700 p-3 space-y-3">
        <p className="text-xs font-medium text-xedu-slate-700 dark:text-xedu-slate-200">Ommaviy yaratish</p>
        <div className="flex gap-2">
          <Input
            placeholder="Daraja (1-11)"
            type="number"
            min={1}
            max={MAX_GRADE}
            value={bulkGrade}
            onChange={(e) => setBulkGrade(e.target.value)}
            className="w-28"
          />
          <Button
            onClick={createBulk}
            disabled={!bulkGrade || bulkLetters.length === 0 || createMut.isPending}
            variant="outline"
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Yaratish
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GRADE_LETTERS.map((letter) => (
            <button
              key={letter}
              onClick={() => toggleLetter(letter)}
              className={cn(
                'text-xs px-2 py-1 rounded-full border transition-colors',
                bulkLetters.includes(letter)
                  ? 'border-xedu-primary bg-xedu-primary-light/40 text-xedu-primary font-semibold'
                  : 'border-xedu-slate-400 dark:border-xedu-slate-500 text-xedu-slate-600 dark:text-xedu-slate-400 hover:border-xedu-primary/60'
              )}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : existingClasses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Sinflar yaratilmagan"
          description="Yuqoridagi ommaviy yaratish orqali sinflarni qo'shing."
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {existingClasses.map((c: any) => (
            <Badge key={c.id} variant="secondary" className="text-sm py-1.5 px-3 flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5" />
              {c.name}
              {c.gradeLevel && <span className="text-xedu-slate-500">({c.gradeLevel})</span>}
              <button
                onClick={() => removeMut.mutate(c.id)}
                className="ml-1 text-xedu-ruby hover:text-xedu-ruby/80"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {!hasClasses && (
        <div className="rounded-xl bg-xedu-amber/5 border border-xedu-amber/10 p-3 text-xs text-xedu-amber flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Kamida 1 ta sinf yaratilishi kerak.</p>
        </div>
      )}

      <Button className="w-full" onClick={onDone} disabled={!hasClasses}>
        {hasClasses ? 'Davom etish' : 'Sinf yaratish'}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
