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
import { SetupStepper, WIZARD_STEPS } from '@/components/setup-wizard/setup-stepper';
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

  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  // Role guard
  const canAccess = !!(user?.role && ROUTE_PERMISSIONS['/dashboard/setup']?.includes(user.role as any));

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    if (!canAccess) {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, user, canAccess, router]);

  // Restore progress from backend
  const { data: onboardingStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: systemConfigApi.getOnboardingStatus,
    staleTime: Infinity,
    enabled: canAccess,
  });

  useEffect(() => {
    if (onboardingStatus) {
      const backendStep = onboardingStatus.onboardingStep || 1;
      const maxStep = Math.min(backendStep, WIZARD_STEPS.length);
      setStep(maxStep);
      const completedSteps = Array.from({ length: maxStep - 1 }, (_, i) => i + 1);
      setCompleted(completedSteps);
      if (onboardingStatus.onboardingCompleted) {
        setDone(true);
      }
    }
  }, [onboardingStatus]);

  // Fetch counts for validation
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
    enabled: canAccess,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.getAll(),
    enabled: canAccess,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll(),
    enabled: canAccess,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
    enabled: canAccess,
  });

  const { data: loads = [] } = useQuery({
    queryKey: ['teaching-loads'],
    queryFn: () => teachingLoadApi.getAll({ status: 'approved' }),
    enabled: canAccess,
  });

  const { data: weekData } = useQuery({
    queryKey: ['schedule-week-drafts'],
    queryFn: () => scheduleApi.getWeek({ includeDrafts: true, includeArchived: false }),
    enabled: canAccess,
  });

  const { data: publishedWeek } = useQuery({
    queryKey: ['schedule-week-published'],
    queryFn: () => scheduleApi.getWeek({ includeDrafts: false, includeArchived: false }),
    enabled: canAccess,
  });

  const allDraftSlots = (weekData as any)?.slots ?? (Array.isArray(weekData) ? weekData : []);
  const draftCount = allDraftSlots.filter((s: any) => s.status === 'draft' || !s.status).length;
  const allPublishedSlots = (publishedWeek as any)?.slots ?? (Array.isArray(publishedWeek) ? publishedWeek : []);
  const publishedCount = allPublishedSlots.filter((s: any) => s.status === 'published').length;

  const setupState: SetupState = useMemo(
    () => ({
      branchesCount: branches.length,
      periodsCount: periods.length,
      roomsCount: rooms.length,
      classesCount: classes.length,
      teachingLoadsCount: loads.length,
      draftSlotsCount: draftCount,
      publishedSlotsCount: publishedCount,
      userRole: user?.role ?? '',
    }),
    [branches.length, periods.length, rooms.length, classes.length, loads.length, draftCount, publishedCount, user?.role]
  );

  const updateOnboarding = useMutation({
    mutationFn: systemConfigApi.updateOnboardingStatus,
  });

  const markStepDone = (s: number) => {
    const nextCompleted = Array.from(new Set([...completed, s]));
    setCompleted(nextCompleted);
    const nextStep = s < WIZARD_STEPS.length ? s + 1 : s;
    setStep(nextStep);
    if (s >= WIZARD_STEPS.length) {
      setDone(true);
      updateOnboarding.mutate({
        onboardingStep: WIZARD_STEPS.length,
        onboardingCompleted: true,
      });
      toast({ title: 'Maktab sozlash yakunlandi!' });
    } else {
      updateOnboarding.mutate({ onboardingStep: nextStep });
    }
  };

  const currentValidation = validateStep(step, setupState);
  const progress = (completed.length / WIZARD_STEPS.length) * 100;
  const currentStepMeta = WIZARD_STEPS.find((w) => w.id === step)!;

  // Prefetch data for next steps
  useEffect(() => {
    if (!canAccess) return;
    queryClient.prefetchQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll });
    queryClient.prefetchQuery({ queryKey: ['periods'], queryFn: () => periodsApi.getAll() });
    queryClient.prefetchQuery({ queryKey: ['rooms'], queryFn: () => roomsApi.getAll() });
    queryClient.prefetchQuery({ queryKey: ['classes'], queryFn: classesApi.getAll });
    queryClient.prefetchQuery({ queryKey: ['teaching-loads'], queryFn: () => teachingLoadApi.getAll({ status: 'approved' }) });
  }, [canAccess, queryClient]);

  if (!_hasHydrated || statusLoading) {
    return <PageSkeleton statsCount={3} />;
  }

  if (!canAccess) {
    return null;
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto w-20 h-20 rounded-full bg-xedu-emerald/10 flex items-center justify-center">
              <ChevronRight className="h-10 w-10 text-xedu-emerald" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Maktabingiz tayyor</h2>
              <p className="text-xedu-slate-500 dark:text-xedu-slate-400 mt-1">
                Barcha asosiy sozlamalar muvaffaqiyatli amalga oshirildi.
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Maktabni sozlash</h1>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400 text-sm">
          {currentStepMeta.label}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex justify-center">
        <SetupStepper
          current={step}
          completed={completed}
          onSelect={(s) => {
            // Allow jumping to completed steps or next available step
            if (completed.includes(s) || s === step || s === step + 1) {
              setStep(s);
            }
          }}
        />
      </div>

      {/* Progress */}
      <div className="space-y-1 max-w-md mx-auto">
        <div className="flex justify-between text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
          <span>Qadam {completed.length} / {WIZARD_STEPS.length}</span>
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
                  {(() => {
                    const Icon = currentStepMeta.icon;
                    return <Icon className="h-5 w-5 text-xedu-primary" />;
                  })()}
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{currentStepMeta.label}</CardTitle>
                  <CardDescription className="text-xs">
                    Qadam {step} / {WIZARD_STEPS.length}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {step === 1 && <StepSchoolBranch onDone={() => markStepDone(1)} />}
              {step === 2 && <StepPeriods onDone={() => markStepDone(2)} />}
              {step === 3 && <StepRooms onDone={() => markStepDone(3)} />}
              {step === 4 && <StepClasses onDone={() => markStepDone(4)} />}
              {step === 5 && <StepTeachingLoads onDone={() => markStepDone(5)} />}
              {step === 6 && <StepGenerate onDone={() => markStepDone(6)} />}
              {step === 7 && <StepPublish onDone={() => markStepDone(7)} />}
            </CardContent>
          </Card>

          {/* Bottom navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step <= 1}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" /> Orqaga
            </Button>

            {!currentValidation.valid && (
              <span className="text-xs text-xedu-amber hidden sm:inline">
                {currentValidation.message}
              </span>
            )}

            <div className="flex items-center gap-2">
              {step < WIZARD_STEPS.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!currentValidation.valid}
                >
                  <SkipForward className="mr-1.5 h-4 w-4" /> O'tkazib yuborish
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                Keyinroq sozlash
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ReadinessSidebar />

          {/* Step list */}
          <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-xedu-slate-700 dark:text-xedu-slate-200 mb-2">Qadamlar</p>
              {WIZARD_STEPS.map((s) => {
                const isDone = completed.includes(s.id);
                const isActive = s.id === step;
                const status = isDone ? 'completed' : isActive ? 'active' : 'pending';
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (isDone || isActive || s.id === step + 1) setStep(s.id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors text-left',
                      status === 'completed'
                        ? 'text-xedu-emerald bg-xedu-emerald/5'
                        : status === 'active'
                        ? 'text-xedu-primary bg-xedu-primary/5 font-medium'
                        : 'text-xedu-slate-500 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40'
                    )}
                  >
                    <span
                      className={cn(
                        'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        status === 'completed'
                          ? 'bg-xedu-emerald text-white'
                          : status === 'active'
                          ? 'bg-xedu-primary text-white'
                          : 'bg-xedu-slate-100 text-xedu-slate-500'
                      )}
                    >
                      {s.id}
                    </span>
                    <span className="truncate">{s.label}</span>
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
