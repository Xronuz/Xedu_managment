'use client';

import { useRouter } from 'next/navigation';
import {
  Calendar, BookOpen, ClipboardCheck, GraduationCap, ChevronRight,
  Users, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TeacherWelcome() {
  const router = useRouter();

  const actions = [
    { label: 'Dars jadvali', desc: 'Bugungi va haftalik darslar', icon: Calendar, href: '/dashboard/schedule' },
    { label: 'Uy vazifalari', desc: 'Topshiriqlarni boshqarish', icon: BookOpen, href: '/dashboard/homework' },
    { label: 'Davomat', desc: 'Sinf davomati', icon: ClipboardCheck, href: '/dashboard/attendance' },
    { label: 'Mening sinfim', desc: 'Sinf ro‘yxati va ma‘lumotlari', icon: GraduationCap, href: '/dashboard/my-class' },
    { label: 'Baholar', desc: 'Baholash jurnali', icon: FileText, href: '/dashboard/grades' },
    { label: 'Imtihonlar', desc: 'Yaqin imtihonlar', icon: Users, href: '/dashboard/exams' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-xedu-primary/10 flex items-center justify-center shrink-0">
          <GraduationCap className="h-6 w-6 text-xedu-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-xedu-slate-900 dark:text-xedu-slate-100">O‘qituvchi ish stoli</h2>
          <p className="text-sm text-xedu-slate-500 mt-0.5 max-w-lg">
            Sizning kundalik ish stolingiz. Dars jadvallari, uy vazifalari, davomat va baholash
            jarayonlarini shu yerdan boshqaring.
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
            <div className="h-9 w-9 rounded-xl bg-xedu-slate-50 dark:bg-xedu-slate-800/60 flex items-center justify-center shrink-0">
              <a.icon className="h-[18px] w-[18px] text-xedu-primary" />
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
        <Button size="sm" onClick={() => router.push('/dashboard/schedule')}>
          <Calendar className="mr-1.5 h-4 w-4" />
          Dars jadvali
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/homework')}>
          <BookOpen className="mr-1.5 h-4 w-4" />
          Uy vazifalari
        </Button>
      </div>
    </div>
  );
}
