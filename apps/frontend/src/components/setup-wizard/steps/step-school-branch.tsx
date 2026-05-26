'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { School, Building2, Users, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { systemConfigApi } from '@/lib/api/system-config';
import { branchesApi } from '@/lib/api/branches';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface StepSchoolBranchProps {
  onDone: () => void;
}

export function StepSchoolBranch({ onDone }: StepSchoolBranchProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: onboardingComputed, isLoading: computedLoading } = useQuery({
    queryKey: ['onboarding-computed'],
    queryFn: systemConfigApi.getOnboardingComputed,
    staleTime: 30_000,
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const isLoading = computedLoading || branchesLoading;
  const schoolProfile = onboardingComputed?.schoolProfile;
  const branchesDone = (branches?.length ?? 0) > 0;

  const items = [
    {
      id: 'name',
      label: 'Maktab nomi',
      done: !!schoolProfile?.completed || !!(user as any)?.schoolName,
      link: '/dashboard/settings',
    },
    {
      id: 'phone',
      label: 'Telefon raqam',
      done: !schoolProfile?.missing?.includes('phone'),
      link: '/dashboard/settings',
    },
    {
      id: 'address',
      label: 'Manzil',
      done: !schoolProfile?.missing?.includes('address'),
      link: '/dashboard/settings',
    },
    {
      id: 'academic_year',
      label: "O'quv yili",
      done: !schoolProfile?.missing?.includes('academic_year'),
      link: '/dashboard/settings',
    },
    {
      id: 'branches',
      label: 'Filiallar',
      done: branchesDone,
      link: '/dashboard/branches',
      count: branches?.length,
    },
  ];

  const allDone = items.every((i) => i.done);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
        Maktabingiz asosiy ma&apos;lumotlari va filiallarini tekshiring. Kamida 1 ta filial bo&apos;lishi kerak.
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <Card
            key={item.id}
            className={cn(
              'border transition-colors',
              item.done
                ? 'border-xedu-emerald/20 bg-xedu-emerald/5 dark:bg-xedu-emerald/5'
                : 'border-xedu-slate-100 dark:border-xedu-slate-800 hover:border-xedu-primary/20'
            )}
          >
            <CardContent className="p-3 flex items-center gap-3">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-xedu-emerald shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-xedu-amber shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', item.done && 'line-through opacity-60')}>
                  {item.label}
                </p>
                {item.count !== undefined && (
                  <p className="text-xs text-xedu-slate-500">{item.count} ta filial</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => router.push(item.link)}
              >
                {item.done ? 'Tahrirlash' : 'To\'ldirish'}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!allDone && (
        <div className="rounded-xl bg-xedu-amber/5 border border-xedu-amber/10 p-3 text-xs text-xedu-amber flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Barcha maydonlarni to&apos;ldiring va kamida 1 ta filial yarating.</p>
        </div>
      )}

      <Button className="w-full" onClick={onDone} disabled={!allDone}>
        {allDone ? 'Davom etish' : 'Barcha maydonlarni to\'ldiring'}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
