'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wand2, Loader2, AlertCircle, ArrowRight, Save, CheckCircle2,
  Info, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { scheduleGeneratorApi } from '@/lib/api/schedule-generator';
import { teachingLoadApi } from '@/lib/api/teaching-load';
import { classesApi } from '@/lib/api/classes';
import { opsCommandCenterApi } from '@/lib/api/ops-command-center';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface StepGenerateProps {
  onDone: () => void;
}

export function StepGenerate({ onDone }: StepGenerateProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [result, setResult] = useState<Awaited<ReturnType<typeof scheduleGeneratorApi.generate>> | null>(null);
  const [committed, setCommitted] = useState(false);

  const { data: loads = [] } = useQuery({
    queryKey: ['teaching-loads'],
    queryFn: () => teachingLoadApi.getAll({ status: 'approved' }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: readiness } = useQuery({
    queryKey: ['readiness', user?.schoolId],
    queryFn: () => (user?.schoolId ? opsCommandCenterApi.getReadiness(user.schoolId) : Promise.reject('no school')),
    enabled: !!user?.schoolId,
  });

  const generateMut = useMutation({
    mutationFn: () =>
      scheduleGeneratorApi.generate({
        classIds: classes.map((c: any) => c.id),
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        strategy: 'greedy',
      }),
    onSuccess: (data) => {
      setResult(data as any);
      toast({ title: `Jadval generatsiya qilindi: ${data.placed} ta joylandi, ${data.failed} ta muvaffaqiyatsiz` });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Generatsiya xatosi' }),
  });

  const commitMut = useMutation({
    mutationFn: () => {
      if (!result) throw new Error('No result');
      return scheduleGeneratorApi.commit(result.proposedSlots, true);
    },
    onSuccess: (data) => {
      setCommitted(true);
      toast({ title: `${data.created} ta dars jadvalga saqlandi` });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['readiness'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Saqlash xatosi' }),
  });

  const readinessOk = (readiness?.score ?? 0) >= 50;
  const canGenerate = classes.length > 0 && loads.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
        Dars jadvali avtomatik generatsiya qilinadi. Oldin barcha sinflar va o&apos;qituvchi yuklamalari tayyor bo&apos;lishi kerak.
      </p>

      {/* Readiness check */}
      <Card className={cn('border', readinessOk ? 'border-xedu-emerald/20' : 'border-xedu-amber/20')}>
        <CardContent className="p-3 flex items-start gap-3">
          {readinessOk ? (
            <CheckCircle2 className="h-5 w-5 text-xedu-emerald shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-xedu-amber shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-medium">
              Tayyorgarlik bahosi: {readiness?.score ?? 0}/100
            </p>
            {!readinessOk && (
              <p className="text-xedu-amber">
                Jadval generatsiya qilish uchun tayyorgarlik bahosi kamida 50 bo&apos;lishi tavsiya etiladi.
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {readiness?.checklist?.map((item) => (
                <span
                  key={item.id}
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
                    item.completed
                      ? 'bg-xedu-emerald/10 text-xedu-emerald'
                      : 'bg-xedu-slate-100 text-xedu-slate-500'
                  )}
                >
                  {item.completed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate button */}
      <Button
        className="w-full"
        size="lg"
        onClick={() => generateMut.mutate()}
        disabled={!canGenerate || generateMut.isPending}
      >
        {generateMut.isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-1.5 h-4 w-4" />
        )}
        {generateMut.isPending ? 'Generatsiya...' : 'Jadvalni generatsiya qilish'}
      </Button>

      {!canGenerate && (
        <div className="rounded-xl bg-xedu-amber/5 border border-xedu-amber/10 p-3 text-xs text-xedu-amber flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Generatsiya uchun kamida 1 ta sinf va 1 ta o&apos;qituvchi yuklamasi kerak.</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
            <CardContent className="p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-xedu-emerald/5 p-2">
                  <p className="text-lg font-bold text-xedu-emerald">{result.placed}</p>
                  <p className="text-[10px] text-xedu-slate-500">Joylandi</p>
                </div>
                <div className="rounded-lg bg-xedu-ruby/5 p-2">
                  <p className="text-lg font-bold text-xedu-ruby">{result.failed}</p>
                  <p className="text-[10px] text-xedu-slate-500">Muvaffaqiyatsiz</p>
                </div>
                <div className="rounded-lg bg-xedu-sky/5 p-2">
                  <p className="text-lg font-bold text-xedu-sky">
                    {result.placed + result.failed > 0
                      ? Math.round((result.placed / (result.placed + result.failed)) * 100)
                      : 0}%
                  </p>
                  <p className="text-[10px] text-xedu-slate-500">Samaradorlik</p>
                </div>
              </div>

              {result.failures && result.failures.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-xedu-slate-700">Muvaffaqiyatsizlar:</p>
                  {result.failures.slice(0, 5).map((f: any, i: number) => (
                    <p key={i} className="text-[10px] text-xedu-slate-500 truncate">
                      • {f.message}
                    </p>
                  ))}
                  {result.failures.length > 5 && (
                    <p className="text-[10px] text-xedu-slate-400">+{result.failures.length - 5} ta yana</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setResult(null); setCommitted(false); }}
            >
              Qayta generatsiya
            </Button>
            <Button
              className="flex-1"
              onClick={() => commitMut.mutate()}
              disabled={committed || commitMut.isPending || result.placed === 0}
            >
              {commitMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {committed ? 'Saqlangan' : 'Loyiha sifatida saqlash'}
            </Button>
          </div>
        </div>
      )}

      {!result && !committed && (
        <EmptyState
          icon={Wand2}
          title="Generatsiya hali amalga oshirilmagan"
          description="Yuqoridagi tugmani bosing va jadvalni avtomatik tuzing."
          className="py-8"
        />
      )}

      <Button className="w-full" onClick={onDone} disabled={!committed}>
        {committed ? 'Davom etish' : 'Avval loyiha sifatida saqlang'}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
