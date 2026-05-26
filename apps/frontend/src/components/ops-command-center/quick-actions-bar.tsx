'use client';

import { useRouter } from 'next/navigation';
import {
  Calendar, Wand2, Repeat, ClipboardCheck,
  Wallet, ShieldCheck, GraduationCap, Users, Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@eduplatform/types';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  roles: UserRole[];
  color: string;
}

const ACTIONS: QuickAction[] = [
  {
    id: 'schedule',
    label: 'Jadvalni ko\'rish',
    icon: Calendar,
    href: '/dashboard/schedule',
    roles: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT],
    color: 'bg-xedu-primary-light text-xedu-primary',
  },
  {
    id: 'generate',
    label: 'Avto-jadval yaratish',
    icon: Wand2,
    href: '/dashboard/schedule',
    roles: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN],
    color: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'substitution',
    label: 'O\'rinbosar belgilash',
    icon: Repeat,
    href: '/dashboard/teacher-substitutions',
    roles: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN],
    color: 'bg-amber-50 text-xedu-amber',
  },
  {
    id: 'attendance',
    label: 'Davomatni ko\'rish',
    icon: ClipboardCheck,
    href: '/dashboard/attendance',
    roles: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER],
    color: 'bg-sky-50 text-xedu-sky',
  },
  {
    id: 'payroll',
    label: 'Ish haqini ko\'rish',
    icon: Wallet,
    href: '/dashboard/payroll',
    roles: [UserRole.DIRECTOR, UserRole.ACCOUNTANT],
    color: 'bg-xedu-gold-50 text-xedu-gold',
  },
  {
    id: 'readiness',
    label: 'Tayyorlikni tekshirish',
    icon: ShieldCheck,
    href: '/dashboard/onboarding',
    roles: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN],
    color: 'bg-emerald-50 text-emerald-600',
  },
];

export function QuickActionsBar() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;

  const visibleActions = ACTIONS.filter((a) => role && a.roles.includes(role));

  return (
    <Card className="border-xedu-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Tezkor amallar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => router.push(action.href)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border border-xedu-border p-3 text-left transition-all',
                  'hover:border-xedu-slate-200 hover:shadow-sm dark:hover:border-xedu-slate-700',
                )}
              >
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', action.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
