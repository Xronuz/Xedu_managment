'use client';

import { useRouter } from 'next/navigation';
import {
  User, Calendar, ClipboardCheck, FileText, ChevronRight,
  CreditCard, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ParentWelcome() {
  const router = useRouter();

  const actions = [
    { label: 'Farzand ma\'lumotlari', desc: 'O\'quvchi profili', icon: User, href: '/dashboard/student' },
    { label: 'Dars jadvali', desc: 'Haftalik darslar', icon: Calendar, href: '/dashboard/schedule' },
    { label: 'Davomat', desc: 'Kunlik davomat holati', icon: ClipboardCheck, href: '/dashboard/attendance' },
    { label: 'Baholar', desc: 'Baholar va GPA', icon: FileText, href: '/dashboard/grades' },
    { label: 'To\'lovlar', desc: 'To\'lov tarixi', icon: CreditCard, href: '/dashboard/payments' },
    { label: 'Uy vazifalari', desc: 'Berilgan topshiriqlar', icon: BookOpen, href: '/dashboard/homework' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-xedu-ruby/10 flex items-center justify-center shrink-0">
          <User className="h-6 w-6 text-xedu-ruby" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">Ota-ona kabineti</h2>
          <p className="text-sm text-xedu-slate-500 mt-0.5 max-w-lg">
            Farzandingizning ta'lim jarayonini kuzatib boring: dars jadvallari, davomat, baholar
            va moliyaviy ma'lumotlar.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <button
            key={a.href}
            onClick={() => router.push(a.href)}
            className="flex items-center gap-3 rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-4 text-left transition-all hover:border-xedu-slate-200 hover:shadow-sm dark:hover:border-xedu-slate-700"
          >
            <div className="h-9 w-9 rounded-xl bg-xedu-slate-50 dark:bg-xedu-slate-800/60 flex items-center justify-center shrink-0">
              <a.icon className="h-[18px] w-[18px] text-xedu-ruby" />
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
        <Button size="sm" onClick={() => router.push('/dashboard/student')}>
          <User className="mr-1.5 h-4 w-4" />
          Farzand profili
        </Button>
      </div>
    </div>
  );
}
