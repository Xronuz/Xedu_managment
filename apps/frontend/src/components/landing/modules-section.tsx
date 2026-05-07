'use client';

import { SectionHeader } from './section-header';
import {
  Users, GraduationCap, Building2, Wallet, MessageSquare, BarChart3, ShieldCheck,
  CalendarDays, ClipboardCheck, Bus, UtensilsCrossed, BookOpen,
} from 'lucide-react';

const modules = [
  {
    icon: Users,
    title: 'Qabul',
    description: 'Abiturientlarni ro\'yxatdan o\'tkazish, hujjatlar boshqaruvi va qabul jarayonlarini avtomatlashtirish.',
  },
  {
    icon: GraduationCap,
    title: 'Akademik',
    description: 'Dars jadvallari, sinflar, fanlar, baholar va o\'quv rejalari boshqaruvi.',
  },
  {
    icon: Building2,
    title: 'Operatsiyalar',
    description: 'Xonalar, jihozlar, transport, ovqatxona va kundalik operatsion jarayonlar.',
  },
  {
    icon: Wallet,
    title: 'Moliya',
    description: 'O\'quvchi to\'lovlari, ish haqi, byudjet, xarajatlar va moliyaviy hisobotlar.',
  },
  {
    icon: MessageSquare,
    title: 'Aloqa',
    description: 'Ota-onalar bilan aloqa, xabarnomalar, uchrashuvlar va ichki xabarlar.',
  },
  {
    icon: BarChart3,
    title: 'Analitika',
    description: 'Davomat, o\'quv natijalari, moliyaviy ko\'rsatkichlar va KPI monitoring.',
  },
  {
    icon: ShieldCheck,
    title: 'Intizom',
    description: 'Intizom jurnali, xulq-atvor monitoringi va xavfsizlik hodisalari.',
  },
  {
    icon: CalendarDays,
    title: 'Kalendar',
    description: 'Akademik yil, imtihonlar, tadbirlar va milliy bayramlar boshqaruvi.',
  },
  {
    icon: ClipboardCheck,
    title: 'Online imtihon',
    description: 'Test sinovlari, avtomatik baholash va natijalar tahlili.',
  },
  {
    icon: Bus,
    title: 'Transport',
    description: 'O\'quvchilar tashish marshrutlari, haydovchilar va transport monitoring.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Ovqatxona',
    description: 'Kunlik menyu, ovqatlanish statistikasi va oziq-ovqat xarajatlari.',
  },
  {
    icon: BookOpen,
    title: 'Kutubxona',
    description: 'Kitoblar fondi, berish-qaytarish, o\'quvchilar o\'qish statistikasi.',
  },
];

export function ModulesSection() {
  return (
    <section id="modullar" className="bg-xedu-bg dark:bg-xedu-slate-950 border-y border-xedu-slate-100 dark:border-xedu-slate-800/50">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <SectionHeader
          label="Modullar"
          title="Operatsion modullar"
          description="Har bir modul ta'lim tashkilotining real ehtiyojlari uchun ishlab chiqilgan."
        />

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.title}
              className="group p-5 rounded-xl bg-white dark:bg-xedu-slate-900 border border-xedu-slate-100 dark:border-xedu-slate-800 hover:border-xedu-primary/20 dark:hover:border-xedu-primary/30 transition-all duration-150"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-9 w-9 rounded-lg bg-xedu-primary-muted dark:bg-xedu-primary/10 flex items-center justify-center">
                  <mod.icon className="h-[18px] w-[18px] text-xedu-primary" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-xedu-slate-900 dark:text-white">
                    {mod.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-xedu-slate-500 dark:text-xedu-slate-400">
                    {mod.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
