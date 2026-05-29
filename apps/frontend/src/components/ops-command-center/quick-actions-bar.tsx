'use client';

import { useRouter } from 'next/navigation';
import {
  Calendar, Wand2, Repeat, ClipboardCheck,
  Wallet, ShieldCheck, GraduationCap, Users, Settings,
  TrendingUp, CreditCard, WalletIcon, Download, FileText,
  Building2, Briefcase, BarChart3, Bell, Zap,
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
  owner?: 'director' | 'vice_principal' | 'branch_admin' | 'accountant';
}

// ── Universal actions (shared across roles) ──────────────────────────────────
const UNIVERSAL_ACTIONS: QuickAction[] = [
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
    roles: [UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN],
    color: 'bg-violet-50 text-violet-600',
    owner: 'vice_principal',
  },
  {
    id: 'substitution',
    label: 'O\'rinbosar belgilash',
    icon: Repeat,
    href: '/dashboard/teacher-substitutions',
    roles: [UserRole.BRANCH_ADMIN],
    color: 'bg-amber-50 text-xedu-amber',
    owner: 'branch_admin',
  },
  {
    id: 'attendance',
    label: 'Davomatni ko\'rish',
    icon: ClipboardCheck,
    href: '/dashboard/attendance',
    roles: [UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER],
    color: 'bg-sky-50 text-xedu-sky',
    owner: 'vice_principal',
  },
  {
    id: 'payroll',
    label: 'Ish haqini ko\'rish',
    icon: Wallet,
    href: '/dashboard/payroll',
    roles: [UserRole.DIRECTOR, UserRole.ACCOUNTANT],
    color: 'bg-xedu-gold-50 text-xedu-gold',
    owner: 'accountant',
  },
  {
    id: 'readiness',
    label: 'Tayyorlikni tekshirish',
    icon: ShieldCheck,
    href: '/dashboard/setup',
    roles: [UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN],
    color: 'bg-emerald-50 text-emerald-600',
    owner: 'branch_admin',
  },
  {
    id: 'finance',
    label: 'Moliyani ko\'rish',
    icon: TrendingUp,
    href: '/dashboard/finance',
    roles: [UserRole.ACCOUNTANT, UserRole.DIRECTOR],
    color: 'bg-xedu-primary-light text-xedu-primary',
    owner: 'accountant',
  },
  {
    id: 'payments',
    label: "To'lovlarni ko\'rish",
    icon: CreditCard,
    href: '/dashboard/payments',
    roles: [UserRole.ACCOUNTANT, UserRole.BRANCH_ADMIN],
    color: 'bg-sky-50 text-xedu-sky',
    owner: 'accountant',
  },
  {
    id: 'fee-structures',
    label: 'Tariflarni ko\'rish',
    icon: WalletIcon,
    href: '/dashboard/fee-structures',
    roles: [UserRole.ACCOUNTANT, UserRole.BRANCH_ADMIN],
    color: 'bg-violet-50 text-violet-600',
    owner: 'accountant',
  },
  {
    id: 'reports',
    label: 'Hisobotlarni ko\'rish',
    icon: FileText,
    href: '/dashboard/reports',
    roles: [UserRole.ACCOUNTANT, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER],
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'export-center',
    label: 'Eksport markazi',
    icon: Download,
    href: '/dashboard/export-center',
    roles: [UserRole.ACCOUNTANT, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER],
    color: 'bg-amber-50 text-xedu-amber',
    owner: 'accountant',
  },
];

// ── Director-curated executive actions ───────────────────────────────────────
const DIRECTOR_OPS_ACTIONS: QuickAction[] = [
  {
    id: 'approvals',
    label: 'Tasdiqlash inbox',
    icon: FileText,
    href: '/dashboard/approvals',
    roles: [UserRole.DIRECTOR],
    color: 'bg-red-50 text-red-600',
    owner: 'director',
  },
  {
    id: 'branches',
    label: 'Filiallar',
    icon: Building2,
    href: '/dashboard/branches',
    roles: [UserRole.DIRECTOR],
    color: 'bg-blue-50 text-blue-600',
    owner: 'director',
  },
  {
    id: 'staff',
    label: 'Xodimlar',
    icon: Briefcase,
    href: '/dashboard/staff',
    roles: [UserRole.DIRECTOR],
    color: 'bg-violet-50 text-violet-600',
    owner: 'director',
  },
  {
    id: 'payroll',
    label: 'Ish haqi',
    icon: Wallet,
    href: '/dashboard/payroll',
    roles: [UserRole.DIRECTOR],
    color: 'bg-emerald-50 text-emerald-600',
    owner: 'accountant',
  },
  {
    id: 'reports',
    label: 'Hisobotlar',
    icon: BarChart3,
    href: '/dashboard/reports',
    roles: [UserRole.DIRECTOR],
    color: 'bg-amber-50 text-amber-600',
    owner: 'director',
  },
  {
    id: 'alerts',
    label: 'Ogohlantirishlar',
    icon: Bell,
    href: '/dashboard/alerts',
    roles: [UserRole.DIRECTOR],
    color: 'bg-xedu-primary-light text-xedu-primary',
    owner: 'director',
  },
  {
    id: 'schedule',
    label: 'Dars jadvali',
    icon: Calendar,
    href: '/dashboard/schedule',
    roles: [UserRole.DIRECTOR],
    color: 'bg-sky-50 text-sky-600',
    owner: 'vice_principal',
  },
  {
    id: 'settings',
    label: 'Sozlamalar',
    icon: Settings,
    href: '/dashboard/settings',
    roles: [UserRole.DIRECTOR],
    color: 'bg-xedu-slate-100 text-xedu-slate-600',
    owner: 'director',
  },
];

const OWNER_BADGE: Record<string, { label: string; className: string }> = {
  director: { label: 'Siz', className: 'bg-xedu-primary-light/60 text-xedu-primary dark:bg-xedu-primary/20 dark:text-xedu-emerald-400' },
  vice_principal: { label: 'VP', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  branch_admin: { label: 'Filial', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  accountant: { label: 'Moliya', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

export function QuickActionsBar() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;
  const isDirector = role === UserRole.DIRECTOR;

  // Director gets curated executive actions only; other roles keep universal list
  const visibleActions = isDirector
    ? DIRECTOR_OPS_ACTIONS
    : UNIVERSAL_ACTIONS.filter((a) => role && a.roles.includes(role));

  return (
    <Card className="border-xedu-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Tezkor amallar</CardTitle>
          {isDirector && (
            <span className="text-2xs font-medium text-xedu-slate-400 uppercase tracking-wider">Direktor ko'rinishi</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const owner = action.owner ? OWNER_BADGE[action.owner] : null;
            return (
              <button
                key={action.id}
                onClick={() => router.push(action.href)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border border-xedu-border p-3 text-left transition-all',
                  'hover:border-xedu-slate-200 hover:shadow-sm dark:hover:border-xedu-slate-700',
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', action.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {owner && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', owner.className)}>
                      {owner.label}
                    </span>
                  )}
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
