'use client';

import { useRouter } from 'next/navigation';
import {
  Users, Calendar, ClipboardCheck, CreditCard, ChevronRight,
  Building2, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BranchAdminWelcome() {
  const router = useRouter();

  const actions = [
    { label: 'Xodimlar', desc: 'Filiallar xodimlari', icon: Users, href: '/dashboard/users' },
    { label: 'Dars jadvali', desc: 'Haftalik darslar', icon: Calendar, href: '/dashboard/schedule' },
    { label: 'Davomat', desc: 'Kunlik davomat nazorati', icon: ClipboardCheck, href: '/dashboard/attendance' },
    { label: 'To‘lovlar', desc: 'Moliyaviy operatsiyalar', icon: CreditCard, href: '/dashboard/payments' },
    { label: 'Sinflar', desc: 'Sinf boshqaruvi', icon: Building2, href: '/dashboard/classes' },
    { label: 'Hisobotlar', desc: 'Filiyal ko‘rsatkichlari', icon: BarChart3, href: '/dashboard/reports' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-xedu-amber/10 flex items-center justify-center shrink-0">
          <Building2 className="h-6 w-6 text-xedu-amber" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">Filial boshqaruvi</h2>
          <p className="text-sm text-xedu-slate-500 mt-0.5 max-w-lg">
            Siz filial ma'muri sifatida kundalik operatsion jarayonlarni boshqarasiz:
            xodimlar, davomat, dars jadvallari va moliya.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <button
            key={a.href}
            onClick={() => router.push(a.href)}
            className="flex items-center gap-3 rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg-elevated p-4 text-left transition-all hover:border-xedu-slate-200 hover:shadow-sm dark:hover:border-xedu-slate-700"
          >
            <div className="h-9 w-9 rounded-xl bg-xedu-slate-50 dark:bg-xedu-slate-800 flex items-center justify-center shrink-0">
              <a.icon className="h-[18px] w-[18px] text-xedu-amber" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-xedu-slate-800 dark:text-xedu-slate-100">{a.label}</p>
              <p className="text-xs text-xedu-slate-500 truncate">{a.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-xedu-slate-300 shrink-0" />
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button size="sm" onClick={() => router.push('/dashboard/users')}>
          <Users className="mr-1.5 h-4 w-4" />
          Xodimlarni boshqarish
        </Button>
      </div>
    </div>
  );
}
