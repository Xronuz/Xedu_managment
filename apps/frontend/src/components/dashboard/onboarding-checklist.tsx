'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Rocket, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { systemConfigApi } from '@/lib/api/system-config';
import { Badge } from '@/components/ui/badge';

const C = {
  primary: 'var(--xedu-primary)',
  primaryLight: 'var(--xedu-primary-light)',
  text: 'var(--xedu-slate-900)',
  muted: 'var(--xedu-slate-500)',
};

export function OnboardingChecklist() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(!!localStorage.getItem('onboarding_dismissed'));
    }
  }, []);

  const { data: status, isLoading } = useQuery({
    queryKey: ['onboarding-computed'],
    queryFn: systemConfigApi.getOnboardingComputed,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const steps = [
    {
      id: 'schoolProfile',
      label: 'Maktab sozlash',
      description: 'Asosiy ma‘lumotlarni kiriting',
      href: '/dashboard/settings',
      done: status?.schoolProfile?.completed ?? false,
    },
    {
      id: 'branches',
      label: 'Filiallar',
      description: 'Kamida 1 ta filial yarating',
      href: '/dashboard/branches',
      done: status?.branches?.completed ?? false,
    },
    {
      id: 'staff',
      label: 'Xodimlar',
      description: 'O‘qituvchi va administratsiya',
      href: '/dashboard/users',
      done: status?.staff?.completed ?? false,
    },
    {
      id: 'education',
      label: 'O‘quv jarayoni',
      description: 'Sinflar, fanlar, o‘qituvchilar',
      href: '/dashboard/classes',
      done: status?.education?.completed ?? false,
    },
  ];

  const allDone = status?.overallCompleted ?? false;
  if (dismissed || allDone) return null;

  const doneCount = steps.filter(s => s.done).length;
  const nextIncomplete = steps.find(s => !s.done);

  return (
    <div className="rounded-xl border border-l-4 bg-white dark:bg-slate-900 p-5 shadow-sm" style={{ borderLeftColor: C.primary }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: C.primaryLight }}>
            <Rocket className="h-4.5 w-4.5" style={{ color: C.primary }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: C.text }}>Maktabni sozlash</p>
            <p className="text-xs" style={{ color: C.muted }}>{doneCount}/{steps.length} qadam bajarildi</p>
          </div>
        </div>
        <button
          onClick={() => { localStorage.setItem('onboarding_dismissed', '1'); setDismissed(true); }}
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <X className="h-3.5 w-3.5" style={{ color: C.muted }} />
        </button>
      </div>

      <div className="h-1.5 w-full rounded-full bg-slate-100 mb-5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%`, background: C.primary }}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-[14px] bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => !step.done && router.push(step.href)}
              className={cn(
                'flex items-start gap-3 rounded-[14px] border p-3.5 text-left transition-colors',
                step.done
                  ? 'bg-xedu-primary-light/40 border-xedu-primary/20 cursor-default'
                  : step.id === nextIncomplete?.id
                  ? 'border-xedu-primary/40 bg-xedu-primary-light/20 cursor-pointer dark:border-xedu-primary/30'
                  : 'border-xedu-slate-100 hover:border-xedu-primary/20 hover:bg-xedu-primary-light/10 cursor-pointer dark:border-xedu-slate-800',
              )}
            >
              <div
                className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                style={step.done ? { background: 'var(--xedu-primary)', color: '#fff' } : { background: 'var(--xedu-slate-100)', color: 'var(--xedu-slate-500)' }}
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-medium', step.done && 'line-through opacity-60')} style={{ color: C.text }}>
                  {step.label}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{step.description}</p>
                {step.id === nextIncomplete?.id && (
                  <Badge variant="outline" className="mt-1 text-[10px] border-xedu-primary/30 text-xedu-primary">Keyingi qadam</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
