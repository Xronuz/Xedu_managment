'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  scheduleGeneratorApi,
  GeneratorConflictReport,
  ProposedSlot,
  SolverRun,
} from '@/lib/api/schedule-generator';
import { ConflictModal, ConflictDetail } from './conflict-modal';
import {
  Calendar, Loader2, CheckCircle2, XCircle, AlertTriangle, Save, Trash2,
  BrainCircuit, Zap, Timer,
} from 'lucide-react';

interface GeneratorDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId?: string;
  onSuccess?: () => void;
}

type Step = 'config' | 'running' | 'result';
type Strategy = 'greedy' | 'hybrid';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000; // 2 minutes max polling

export function GeneratorDialog({ open, onOpenChange, branchId, onSuccess }: GeneratorDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('config');
  const [strategy, setStrategy] = useState<Strategy>('greedy');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [weekType, setWeekType] = useState<string>('all');
  const [report, setReport] = useState<GeneratorConflictReport | null>(null);
  const [solverRun, setSolverRun] = useState<SolverRun | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  useEffect(() => {
    if (!open) {
      clearPolling();
    }
  }, [open, clearPolling]);

  const generateMutation = useMutation({
    mutationFn: () => scheduleGeneratorApi.generate({
      branchId,
      strategy: 'greedy',
      overwriteExisting,
      weekType,
    }),
    onSuccess: (data) => {
      setReport(data);
      setStep('result');
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Generatsiya xatosi' });
    },
  });

  const advancedGenerateMutation = useMutation({
    mutationFn: () => scheduleGeneratorApi.advancedGenerate({
      branchId,
      strategy: 'hybrid',
      overwriteExisting,
      weekType,
      timeoutMs: 30000,
      maxDepth: 2,
    }),
    onSuccess: (run) => {
      setSolverRun(run);
      setStep('running');
      startPolling(run.id);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Ilg‘or generatsiya xatosi' });
    },
  });

  const startPolling = useCallback((runId: string) => {
    clearPolling();
    pollStartRef.current = Date.now();

    const check = async () => {
      try {
        const run = await scheduleGeneratorApi.getSolverRun(runId);
        setSolverRun(run);

        if (run.status === 'completed') {
          clearPolling();
          const meta = run.metadata || {};
          // Reconstruct GeneratorConflictReport from metadata
          const reconstructed: GeneratorConflictReport = {
            totalDemands: run.demandsCount,
            placed: run.placedCount,
            failed: run.failureCount,
            proposedSlots: meta.proposedSlots || [],
            failures: meta.failures || [],
            stats: {
              byReason: meta.diagnostics?.byReason || {},
              byTeacher: meta.diagnostics?.byTeacher || {},
              byClass: meta.diagnostics?.byClass || {},
              bySubject: meta.diagnostics?.bySubject || {},
            },
          };
          setReport(reconstructed);
          setStep('result');
          toast({ title: 'Jadval generatsiyasi tugadi', description: `${run.placedCount} ta slot joylashtirildi` });
        } else if (run.status === 'failed' || run.status === 'cancelled') {
          clearPolling();
          setRunError(run.metadata?.error || 'Generatsiya bekor qilindi yoki xatolik yuz berdi');
          setStep('result');
        }

        // Timeout guard
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          clearPolling();
          setRunError('Kutish vaqti tugadi. Iltimos, natijalarni keyinroq tekshiring.');
          setStep('result');
        }
      } catch (err: any) {
        // Network errors during polling — keep trying until timeout
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          clearPolling();
          setRunError('Tarmoq xatosi: natijalar olinmadi.');
          setStep('result');
        }
      }
    };

    check(); // immediate first check
    pollRef.current = setInterval(check, POLL_INTERVAL_MS);
  }, [clearPolling, toast]);

  const commitMutation = useMutation({
    mutationFn: (slots: ProposedSlot[]) => scheduleGeneratorApi.commit(slots, overwriteExisting),
    onSuccess: (data) => {
      toast({ title: `${data.created} ta slot saqlandi` });
      if (data.errors.length > 0) {
        toast({ variant: 'destructive', title: 'Ba\'zi slotlar saqlanmadi', description: data.errors.join('; ') });
      }
      onSuccess?.();
      handleClose(false);
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        const data = err.response.data;
        const list: ConflictDetail[] = data?.conflicts ?? [];
        if (list.length > 0) {
          setConflicts(list);
          setConflictOpen(true);
          return;
        }
      }
      toast({ variant: 'destructive', title: 'Saqlashda xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  function reset() {
    setStep('config');
    setReport(null);
    setSolverRun(null);
    setRunError(null);
    setOverwriteExisting(false);
    setWeekType('all');
    setStrategy('greedy');
    clearPolling();
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  const handleGenerate = () => {
    if (strategy === 'greedy') {
      generateMutation.mutate();
    } else {
      advancedGenerateMutation.mutate();
    }
  };

  const isPending = generateMutation.isPending || advancedGenerateMutation.isPending || (step === 'running');

  const failureReasons = report ? Object.entries(report.stats.byReason) : [];
  const failureTeachers = report ? Object.entries(report.stats.byTeacher) : [];
  const failureClasses = report ? Object.entries(report.stats.byClass) : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Avto-jadval generatsiyasi
          </DialogTitle>
          <DialogDescription>
            {strategy === 'greedy'
              ? 'Greedy algoritm yordamida dars jadvalini avtomatik tashkil etish'
              : 'Hybrid (greedy + backtracking) algoritm yordamida optimallashtirilgan jadval'}
          </DialogDescription>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-4 py-2">
            {/* Strategy selector */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Strategiya</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStrategy('greedy')}
                  className={`flex items-center gap-2 rounded-lg border p-3 transition-colors text-left ${
                    strategy === 'greedy'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <Zap className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Greedy</div>
                    <div className="text-xs opacity-70">Tez, oddiy qoidalar</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy('hybrid')}
                  className={`flex items-center gap-2 rounded-lg border p-3 transition-colors text-left ${
                    strategy === 'hybrid'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <BrainCircuit className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Hybrid</div>
                    <div className="text-xs opacity-70">Optimallashtirilgan, backtracking</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <input
                id="gen-overwrite"
                type="checkbox"
                checked={overwriteExisting}
                onChange={e => setOverwriteExisting(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="gen-overwrite" className="text-sm text-yellow-800 cursor-pointer">
                Mavjud jadvalni ustiga yozish
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-xedu-slate-600 dark:text-xedu-slate-400">Hafta turi:</span>
              {(['all','numerator','denominator'] as const).map((wt) => (
                <button
                  key={wt}
                  type="button"
                  onClick={() => setWeekType(wt)}
                  className={`h-7 px-2 rounded text-xs border transition-colors ${
                    weekType === wt ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-xedu-slate-800 text-xedu-slate-600 border-xedu-slate-200'
                  }`}
                >
                  {wt === 'all' ? 'Oddiy' : wt === 'numerator' ? 'Surat' : 'Maxraj'}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800/60 border text-sm text-xedu-slate-600 dark:text-xedu-slate-400">
              <p className="font-medium text-xedu-slate-700 dark:text-xedu-slate-300 mb-1">Qoidalari:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>O&apos;qituvchi bir vaqtda faqat 1 ta dars olib borishi mumkin</li>
                <li>Sinf bir vaqtda faqat 1 ta darsga qatnashishi mumkin</li>
                <li>Xona bir vaqtda faqat 1 ta dars uchun band bo&apos;lishi mumkin</li>
                <li>Dars soatlari filialning &quot;Dars soatlari&quot; sozlamalaridan olinadi</li>
              </ul>
            </div>

            {strategy === 'hybrid' && (
              <div className="flex items-center gap-2 text-xs text-xedu-slate-500">
                <Timer className="h-3.5 w-3.5" />
                Hybrid rejimda generatsiya 10–60 soniya davom etishi mumkin. Natijalar tayyor bo‘lganda ko‘rsatiladi.
              </div>
            )}
          </div>
        )}

        {step === 'running' && solverRun && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Jadval tayyorlanmoqda...</p>
                <p className="text-sm text-xedu-slate-500 mt-1">
                  Hybrid algoritm ishlamoqda. Bu bir necha soniya davom etishi mumkin.
                </p>
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <div className="flex justify-between text-xs text-xedu-slate-500">
                <span>Status</span>
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Ishlamoqda
                </Badge>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-[10px] text-xedu-slate-400 text-center">
                Run ID: {solverRun.id}
              </p>
            </div>
          </div>
        )}

        {step === 'result' && report && (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/40 border">
                <div className="text-2xl font-bold">{report.totalDemands}</div>
                <div className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Jami talab</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="text-2xl font-bold text-xedu-primary">{report.placed}</div>
                <div className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Joylashtirildi</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="text-2xl font-bold text-red-600">{report.failed}</div>
                <div className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Joylashmadi</div>
              </div>
            </div>

            {/* Proposed slots preview */}
            {report.proposedSlots.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="p-2 bg-xedu-slate-50 dark:bg-xedu-slate-800/60 text-xs font-medium text-xedu-slate-500 dark:text-xedu-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-xedu-primary" />
                  Taklif qilingan slotlar ({report.proposedSlots.length}):
                </div>
                <ScrollArea className="max-h-48">
                  <div className="divide-y">
                    {report.proposedSlots.slice(0, 20).map((slot) => (
                      <div key={slot.id} className="px-3 py-2 text-xs font-mono flex items-center justify-between">
                        <span>
                          {slot.dayOfWeek} · slot {slot.timeSlot} ({slot.startTime}-{slot.endTime})
                        </span>
                        <span className="text-xedu-slate-500">
                          class:{slot.classId.slice(0,6)}… subj:{slot.subjectId.slice(0,6)}…
                          {slot.roomId && ` · room:${slot.roomId.slice(0,6)}…`}
                        </span>
                      </div>
                    ))}
                    {report.proposedSlots.length > 20 && (
                      <div className="px-3 py-2 text-xs text-xedu-slate-500">
                        … va yana {report.proposedSlots.length - 20} ta
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Failure reasons */}
            {failureReasons.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="p-2 bg-red-50 text-xs font-medium text-red-700 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  Sabablar bo&apos;yicha ({failureReasons.length} ta tur):
                </div>
                <div className="p-2 space-y-1">
                  {failureReasons.map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className="text-red-600 border-red-200">{reason}</Badge>
                      <span className="text-red-600 font-medium">{count} ta</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failure by teacher */}
            {failureTeachers.length > 0 && (
              <div className="border border-amber-200 rounded-lg overflow-hidden">
                <div className="p-2 bg-amber-50 text-xs font-medium text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  O&apos;qituvchilar bo&apos;yicha:
                </div>
                <div className="p-2 space-y-1">
                  {failureTeachers.slice(0, 5).map(([teacherId, count]) => (
                    <div key={teacherId} className="flex items-center justify-between text-xs">
                      <span className="text-xedu-slate-600">{teacherId.slice(0, 8)}…</span>
                      <span className="text-amber-600 font-medium">{count} ta</span>
                    </div>
                  ))}
                  {failureTeachers.length > 5 && (
                    <div className="text-xs text-xedu-slate-500">… va yana {failureTeachers.length - 5} ta</div>
                  )}
                </div>
              </div>
            )}

            {/* Failure by class */}
            {failureClasses.length > 0 && (
              <div className="border border-amber-200 rounded-lg overflow-hidden">
                <div className="p-2 bg-amber-50 text-xs font-medium text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Sinflar bo&apos;yicha:
                </div>
                <div className="p-2 space-y-1">
                  {failureClasses.slice(0, 5).map(([classId, count]) => (
                    <div key={classId} className="flex items-center justify-between text-xs">
                      <span className="text-xedu-slate-600">{classId.slice(0, 8)}…</span>
                      <span className="text-amber-600 font-medium">{count} ta</span>
                    </div>
                  ))}
                  {failureClasses.length > 5 && (
                    <div className="text-xs text-xedu-slate-500">… va yana {failureClasses.length - 5} ta</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'result' && runError && (
          <div className="py-8">
            <div className="flex flex-col items-center gap-3">
              <XCircle className="h-10 w-10 text-destructive" />
              <div className="text-center">
                <p className="text-lg font-medium text-destructive">Generatsiya amalga oshmadi</p>
                <p className="text-sm text-xedu-slate-500 mt-1 max-w-sm">{runError}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'config' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Bekor</Button>
              <Button
                onClick={handleGenerate}
                disabled={isPending}
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generatsiya…</>
                  : <><Calendar className="h-4 w-4 mr-2" />Jadval yaratish</>
                }
              </Button>
            </>
          )}

          {step === 'running' && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Orqaga (natijalarni keyin tekshiring)
            </Button>
          )}

          {step === 'result' && report && (
            <>
              <Button variant="outline" onClick={reset}>
                Qayta urinish
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleClose(false)}
              >
                <Trash2 className="h-4 w-4 mr-2" />Bekor qilish
              </Button>
              <Button
                onClick={() => commitMutation.mutate(report.proposedSlots)}
                disabled={commitMutation.isPending || report.proposedSlots.length === 0}
              >
                {commitMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda…</>
                  : <><Save className="h-4 w-4 mr-2" />{report.proposedSlots.length} ta slotni saqlash</>
                }
              </Button>
            </>
          )}

          {step === 'result' && runError && (
            <>
              <Button variant="outline" onClick={reset}>
                Qayta urinish
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Yopish
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      <ConflictModal
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        conflicts={conflicts}
      />
    </Dialog>
  );
}
