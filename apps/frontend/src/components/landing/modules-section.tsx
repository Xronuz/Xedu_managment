'use client';

import { SectionHeader } from './section-header';
import {
  Users, GraduationCap, Building2, Wallet, MessageSquare, BarChart3, ShieldCheck,
  CalendarDays, ClipboardCheck, Bus, UtensilsCrossed, BookOpen,
} from 'lucide-react';

const modules = [
  { icon: Users, title: 'Qabul', description: 'Abiturientlarni ro\'yxatdan o\'tkazish, hujjatlar boshqaruvi va qabul jarayonlarini avtomatlashtirish.' },
  { icon: GraduationCap, title: 'Akademik', description: 'Dars jadvallari, sinflar, fanlar, baholar va o\'quv rejalari boshqaruvi.' },
  { icon: Building2, title: 'Operatsiyalar', description: 'Xonalar, jihozlar, transport, ovqatxona va kundalik operatsion jarayonlar.' },
  { icon: Wallet, title: 'Moliya', description: 'O\'quvchi to\'lovlari, ish haqi, byudjet, xarajatlar va moliyaviy hisobotlar.' },
  { icon: MessageSquare, title: 'Aloqa', description: 'Ota-onalar bilan aloqa, xabarnomalar, uchrashuvlar va ichki xabarlar.' },
  { icon: BarChart3, title: 'Analitika', description: 'Davomat, o\'quv natijalari, moliyaviy ko\'rsatkichlar va KPI monitoring.' },
  { icon: ShieldCheck, title: 'Intizom', description: 'Intizom jurnali, xulq-atvor monitoringi va xavfsizlik hodisalari.' },
  { icon: CalendarDays, title: 'Kalendar', description: 'Akademik yil, imtihonlar, tadbirlar va milliy bayramlar boshqaruvi.' },
  { icon: ClipboardCheck, title: 'Online imtihon', description: 'Test sinovlari, avtomatik baholash va natijalar tahlili.' },
  { icon: Bus, title: 'Transport', description: 'O\'quvchilar tashish marshrutlari, haydovchilar va transport monitoring.' },
  { icon: UtensilsCrossed, title: 'Ovqatxona', description: 'Kunlik menyu, ovqatlanish statistikasi va oziq-ovqat xarajatlari.' },
  { icon: BookOpen, title: 'Kutubxona', description: 'Kitoblar fondi, berish-qaytarish, o\'quvchilar o\'qish statistikasi.' },
];

export function ModulesSection() {
  return (
    <section id="modullar" className="relative surface-atmospheric overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32">
        <SectionHeader
          label="Modullar"
          title="Operatsion modullar"
          description="Har bir modul ta'lim tashkilotining real ehtiyojlari uchun ishlab chiqilgan."
        />

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.title}
              className="group relative rounded-2xl bg-white shadow-premium-sm hover:shadow-premium-md transition-all duration-300 p-6"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/40 to-transparent rounded-t-2xl" />

              <div className="flex items-start gap-4">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-xedu-primary/[0.06] flex items-center justify-center">
                  <mod.icon className="h-[18px] w-[18px] text-xedu-primary" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-xedu-slate-900 tracking-tight">
                    {mod.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-[1.7] text-xedu-slate-500">
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
