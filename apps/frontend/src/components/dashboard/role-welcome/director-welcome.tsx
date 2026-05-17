'use client';

import { useRouter } from 'next/navigation';
import {
  Building2, Users, BarChart3, Settings, ChevronRight,
  GraduationCap, Calendar, BookOpen, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PCard } from '@/app/(dashboard)/dashboard/_components/shared-widgets';

/**
 * Director welcome/orientation card.
 * Shown on first login or when organization setup is incomplete.
 */
export function DirectorWelcome() {
  const router = useRouter();

  const actions = [
    { label: 'Maktab sozlash', desc: 'Asosiy ma‘lumotlarni kiriting', icon: Building2, href: '/dashboard/settings', color: 'text-xedu-primary' },
    { label: 'Filiallar', desc: 'Filiallarni boshqarish', icon: GraduationCap, href: '/dashboard/branches', color: 'text-xedu-sky' },
    { label: 'Xodimlar', desc: 'O‘qituvchi va administratsiya', icon: Users, href: '/dashboard/users', color: 'text-xedu-violet' },
    { label: 'Hisobotlar', desc: 'Umumiy ko‘rsatkichlar', icon: BarChart3, href: '/dashboard/reports', color: 'text-xedu-amber' },
    { label: 'Dars jadvali', desc: 'Haftalik jadval tuzish', icon: Calendar, href: '/dashboard/schedule', color: 'text-xedu-ruby' },
    { label: 'Fanlar', desc: 'O‘quv dasturini sozlash', icon: BookOpen, href: '/dashboard/subjects', color: 'text-xedu-emerald' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-xedu-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-6 w-6 text-xedu-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">Boshqaruv markazi</h2>
          <p className="text-sm text-xedu-slate-500 mt-0.5 max-w-lg">
            Siz direktor sifatida maktabingizning barcha operatsion jarayonlarini boshqarasiz.
            Quyidagi yo'nalishlardan birini tanlang.
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
            <div className={`h-9 w-9 rounded-xl bg-xedu-slate-50 dark:bg-xedu-slate-800/60 flex items-center justify-center shrink-0`}>
              <a.icon className={`h-[18px] w-[18px] ${a.color}`} />
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
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/settings')}>
          <Settings className="mr-1.5 h-4 w-4" />
          Sozlamalar
        </Button>
        <Button size="sm" onClick={() => router.push('/dashboard/onboarding')}>
          <Building2 className="mr-1.5 h-4 w-4" />
          Maktabni sozlash
        </Button>
      </div>
    </div>
  );
}
