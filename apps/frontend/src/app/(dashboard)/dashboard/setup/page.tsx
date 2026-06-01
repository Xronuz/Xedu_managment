'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, SkipForward, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { systemConfigApi } from '@/lib/api/system-config';
import { branchesApi } from '@/lib/api/branches';
import { periodsApi } from '@/lib/api/periods';
import { roomsApi } from '@/lib/api/rooms';
import { classesApi } from '@/lib/api/classes';
import { teachingLoadApi } from '@/lib/api/teaching-load';
import { scheduleApi } from '@/lib/api/schedule';
import { SetupStepper, WIZARD_STEPS, DIRECTOR_STEPS, BRANCH_ADMIN_STEPS } from '@/components/setup-wizard/setup-stepper';
import { ReadinessSidebar } from '@/components/setup-wizard/readiness-sidebar';
import { StepSchoolBranch } from '@/components/setup-wizard/steps/step-school-branch';
import { StepPeriods } from '@/components/setup-wizard/steps/step-periods';
import { StepRooms } from '@/components/setup-wizard/steps/step-rooms';
import { StepClasses } from '@/components/setup-wizard/steps/step-classes';
import { StepTeachingLoads } from '@/components/setup-wizard/steps/step-teaching-loads';
import { StepGenerate } from '@/components/setup-wizard/steps/step-generate';
import { StepPublish } from '@/components/setup-wizard/steps/step-publish';
import { validateStep, type SetupState } from '@/lib/setup-validator';
import { ROUTE_PERMISSIONS } from '@/config/permissions';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/ui/loading-skeletons';

export default function SetupWizardPage() {
  const { user, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Role detection
  const isDirector    = user?.role === 'director';
  const isBranchAdmin = user?.role === 'branch_admin';

  // Steps this role owns
  const mySteps = isDirector ? DIRECTOR_STEPS : BRANCH_ADMIN_STEPS;
  const myFirstStep = mySteps[0]?.id ?? 1;
  const myLastStep  = mySteps[mySteps.length - 1]?.id ?? WIZARD_STEPS.length;

  const [step, setStep] = useState(myFirstStep);
  const [completed, setCompleted] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Role guard — only director and branch_admin
  const canAccess = !!(user?.role && ROUTE_PERMISSIONS['/dashboard/setup']?.includes(user.role as any));

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    if (!canAccess) router.replace('/dashboard');
  }, [_hasHydrated, user, canAccess, router]);

  // Safety timeout: if loading takes >5s, proceed with defaults
  useEffect(() => {
    const t = setTimeout(() => setLoadingTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Restore progress from backend
  const { data: onboardingStatus, isLoading: statusLoading, isError: statusError } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: systemConfigApi.getOnboardingStatus,
    staleTime: Infinity,
    enabled: canAccess,
    retry: 1,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (!onboardingStatus) return;
    const backendStep = onboardingStatus.onboardingStep || 1;

    // Build completed list from backendStep
    const completedSteps = Array.from({ length: backendStep - 1 }, (_, i) => i + 1);
    setCompleted(completedSteps);

    if (onboardingStatus.onboardingCompleted) {
      setDone(true);
      return;
    }

    if (isDirector) {
      // Director only owns step 1; if already done, show handoff screen
      if (backendStep > 1) {
        setDone(true);
      } else {
        setStep(1);
      }
    } else {
      // Branch admin owns steps 2-7; clamp to their range
      const clampedStep = Math.max(myFirstStep, Math.min(backendStep, myLastStep));
      setStep(clampedStep);
    }
  }, [onboardingStatus, isDirector, myFirstStep, myLastStep]);

  // Fetch counts for validation
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll, enabled: canAccess });
  const { data: periods  = [] } = useQuery({ queryKey: ['periods'],  queryFn: () => periodsApi.getAll(), enabled: canAccess });
  const { data: rooms    = [] } = useQuery({ queryKey: ['rooms'],    queryFn: () => roomsApi.getAll(), enabled: canAccess });
  const { data: classes  = [] } = useQuery({ queryKey: ['classes'],  queryFn: classesApi.getAll, enabled: canAccess });
  const { data: loads    = [] } = useQuery({ queryKey: ['teaching-loads'], queryFn: () => teachingLoadApi.getAll({ status: 'approved' }), enabled: canAccess });

  const { data: weekData      } = useQuery({ queryKey: ['schedule-week-drafts'],    queryFn: () => scheduleApi.getWeek({ includeDrafts: true,  includeArchived: false }), enabled: canAccess });
  const { data: publishedWeek } = useQuery({ queryKey: ['schedule-week-published'], queryFn: () => scheduleApi.getWeek({ includeDrafts: false, includeArchived: false }), enabled: canAccess });

  const draftCount     = ((weekData as any)?.slots ?? (Array.isArray(weekData) ? weekData : [])).filter((s: any) => s.status === 'draft' || !s.status).length;
  const publishedCount = ((publishedWeek as any)?.slots ?? (Array.isArray(publishedWeek) ? publishedWeek : [])).filter((s: any) => s.status === 'published').length;

  const setupState: SetupState = useMemo(() => ({
    branchesCount:      branches.length,
    periodsCount:       periods.length,
    roomsCount:         rooms.length,
    classesCount:       classes.length,
    teachingLoadsCount: loads.length,
    draftSlotsCount:    draftCount,
    publishedSlotsCount:publishedCount,
    userRole:           user?.role ?? '',
  }), [branches.length, periods.length, rooms.length, classes.length, loads.length, draftCount, publishedCount, user?.role]);

  const updateOnboarding = useMutation({ mutationFn: systemConfigApi.updateOnboardingStatus });

  const markStepDone = (s: number) => {
    const nextCompleted = Array.from(new Set([...completed, s]));
    setCompleted(nextCompleted);

    const isLastForRole = s >= myLastStep;
    const isAllDone = s >= WIZARD_STEPS.length;

    if (isLastForRole) {
      setDone(true);
      updateOnboarding.mutate({
        onboardingStep: s + 1,
        onboardingCompleted: isAllDone,
      });
      toast({ title: isDirector ? 'Maktab & Filial sozlandi!' : 'Maktab sozlash yakunlandi!' });
    } else {
      const nextStep = s + 1;
      setStep(nextStep);
      updateOnboarding.mutate({ onboardingStep: nextStep });
    }
  };

  // Prefetch
  useEffect(() => {
    if (!canAccess) return;
    queryClient.prefetchQuery({ queryKey: ['branches'],       queryFn: branchesApi.getAll });
    queryClient.prefetchQuery({ queryKey: ['periods'],        queryFn: () => periodsApi.getAll() });
    queryClient.prefetchQuery({ queryKey: ['rooms'],          queryFn: () => roomsApi.getAll() });
    queryClient.prefetchQuery({ queryKey: ['classes'],        queryFn: classesApi.getAll });
    queryClient.prefetchQuery({ queryKey: ['teaching-loads'], queryFn: () => teachingLoadApi.getAll({ status: 'approved' }) });
  }, [canAccess, queryClient]);

  // Don't block render if API errored or timed out
  const isReallyLoading = statusLoading && !statusError && !loadingTimedOut;
  if (!_hasHydrated || isReallyLoading) return <PageSkeleton statsCount={3} />;
  if (!canAccess) return null;

  // ── Completion screens ──────────────────────────────────────────────────────
  if (done) {
    // Director handoff
    if (isDirector) {
      return (
        <div className="max-w-2xl mx-auto pt-8">
          <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
            <CardContent className="p-8 text-center space-y-5">
              <div className="mx-auto w-20 h-20 rounded-full bg-xedu-emerald/10 flex items-center justify-center">
                <ChevronRight className="h-10 w-10 text-xedu-emerald" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Maktab & Filial sozlandi</h2>
                <p className="text-xedu-slate-500 dark:text-xedu-slate-400 mt-2 text-sm leading-relaxed">
                  Asosiy sozlamalar bajarildi. Endi <strong>filial administratori</strong> dars
                  davrlari, xonalar, sinflar va jadval sozlamalarini bajarishi kerak.
                </p>
              </div>
              <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-slate-50 dark:bg-xedu-slate-900 p-4 text-left space-y-2 max-w-xs mx-auto">
                <p className="text-xs font-semibold text-xedu-slate-500 dark:text-xedu-slate-400 uppercase tracking-wider mb-3">Filial admin qadamlari</p>
                {BRANCH_ADMIN_STEPS.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-xedu-slate-600 dark:text-xedu-slate-400">
                    <s.icon className="h-3.5 w-3.5 shrink-0 text-xedu-slate-400" />
                    {s.label}
                  </div>
                ))}
              </div>
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                Bosh sahifaga qaytish
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Branch admin — full completion
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto w-20 h-20 rounded-full bg-xedu-emerald/10 flex items-center justify-center">
              <ChevronRight className="h-10 w-10 text-xedu-emerald" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Maktabingiz tayyor!</h2>
              <p className="text-xedu-slate-500 dark:text-xedu-slate-400 mt-1">
                Barcha sozlamalar muvaffaqiyatli amalga oshirildi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <Button variant="outline" onClick={() => router.push('/dashboard/schedule')}>
                Dars jadvali
              </Button>
              <Button onClick={() => router.push('/dashboard/ops')}>
                Operatsion markaz
              </Button>
            </div>
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              Bosh sahifaga qaytish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Active wizard ───────────────────────────────────────────────────────────
  const currentValidation = validateStep(step, setupState);
  const myCompletedCount  = completed.filter(id => mySteps.some(s => s.id === id)).length;
  const progress          = (myCompletedCount / mySteps.length) * 100;
  const currentStepMeta   = WIZARD_STEPS.find((w) => w.id === step)!;
  const stepIndexInMySteps = mySteps.findIndex(s => s.id === step);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Maktabni sozlash</h1>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400 text-sm">
          {isDirector ? 'Maktab va filial ma\'lumotlarini kiriting' : 'Akademik tuzilmani sozlang'}
        </p>
      </div>

      {/* Stepper — full chain view, but only my steps are interactive */}
      <div className="flex justify-center">
        <SetupStepper
          current={step}
          completed={completed}
          onSelect={(s) => {
            const stepMeta = WIZARD_STEPS.find(w => w.id === s);
            const isMine = stepMeta?.ownerRole === (isDirector ? 'director' : 'branch_admin');
            if (isMine && (completed.includes(s) || s === step || s === step + 1)) {
              setStep(s);
            }
          }}
        />
      </div>

      {/* Progress — relative to this role's steps */}
      <div className="space-y-1 max-w-md mx-auto">
        <div className="flex justify-between text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
          <span>Qadam {myCompletedCount} / {mySteps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main step content */}
        <div className="lg:col-span-2">
          <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-xedu-primary/10">
                  {(() => { const Icon = currentStepMeta.icon; return <Icon className="h-5 w-5 text-xedu-primary" />; })()}
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{currentStepMeta.label}</CardTitle>
                  <CardDescription className="text-xs">
                    Qadam {stepIndexInMySteps + 1} / {mySteps.length}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {step === 1 && <StepSchoolBranch onDone={() => markStepDone(1)} />}
              {step === 2 && <StepPeriods      onDone={() => markStepDone(2)} />}
              {step === 3 && <StepRooms        onDone={() => markStepDone(3)} />}
              {step === 4 && <StepClasses      onDone={() => markStepDone(4)} />}
              {step === 5 && <StepTeachingLoads onDone={() => markStepDone(5)} />}
              {step === 6 && <StepGenerate     onDone={() => markStepDone(6)} />}
              {step === 7 && <StepPublish      onDone={() => markStepDone(7)} />}
            </CardContent>
          </Card>

          {/* Bottom navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(myFirstStep, s - 1))}
              disabled={step <= myFirstStep}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" /> Orqaga
            </Button>

            {!currentValidation.valid && (
              <span className="text-xs text-xedu-amber hidden sm:inline">
                {currentValidation.message}
              </span>
            )}

            <div className="flex items-center gap-2">
              {step < myLastStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!currentValidation.valid}
                >
                  <SkipForward className="mr-1.5 h-4 w-4" /> O'tkazib yuborish
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                Keyinroq sozlash
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ReadinessSidebar />

          {/* Step list — shows all 7 steps with ownership labels */}
          <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-xedu-slate-700 dark:text-xedu-slate-200 mb-2">Barcha qadamlar</p>
              {WIZARD_STEPS.map((s) => {
                const isDone   = completed.includes(s.id);
                const isActive = s.id === step;
                const isMine   = s.ownerRole === (isDirector ? 'director' : 'branch_admin');
                const status   = isDone ? 'completed' : isActive ? 'active' : 'pending';
                return (
                  <button
                    key={s.id}
                    disabled={!isMine}
                    onClick={() => {
                      if (isMine && (isDone || isActive || s.id === step + 1)) setStep(s.id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors text-left',
                      !isMine && 'opacity-40 cursor-default',
                      status === 'completed' ? 'text-xedu-emerald bg-xedu-emerald/5'
                        : status === 'active' ? 'text-xedu-primary bg-xedu-primary/5 font-medium'
                        : isMine ? 'text-xedu-slate-500 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40'
                        : 'text-xedu-slate-400',
                    )}
                  >
                    <span className={cn(
                      'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      status === 'completed' ? 'bg-xedu-emerald text-white'
                        : status === 'active' ? 'bg-xedu-primary text-white'
                        : 'bg-xedu-slate-100 text-xedu-slate-500',
                    )}>
                      {s.id}
                    </span>
                    <span className="truncate flex-1">{s.label}</span>
                    {!isMine && (
                      <span className="text-[9px] shrink-0 text-xedu-slate-400">
                        {s.ownerRole === 'director' ? 'Direktor' : 'Admin'}
                      </span>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
