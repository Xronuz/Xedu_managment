'use client';

import { SectionHeader } from './section-header';
import { BarChart3, Users, GraduationCap, UserCircle, School } from 'lucide-react';

const roles = [
  {
    icon: School,
    title: 'Direktor',
    summary: 'Strategik nazorat',
    description: 'Barcha filiallarning operatsion ko\'rsatkichlarini real vaqtda ko\'ring. Moliyaviy holat, davomat dinamikasi va xodimlar samaradorligi uchun yagona oyna.',
    metrics: ['KPI dashboard', 'Filial taqqoslash', 'Moliyaviy hisobot'],
  },
  {
    icon: Users,
    title: 'Filial boshlig\'i',
    summary: 'Operatsion boshqaruv',
    description: 'O\'z filialingizning barcha jarayonlarini boshqaring. Dars jadvallari, xodimlar nazorati, ota-onalar aloqasi va kunlik operatsiyalar.',
    metrics: ['Dars jadvali', 'Xodimlar nazorati', 'Davomat monitoring'],
  },
  {
    icon: GraduationCap,
    title: 'O\'qituvchi',
    summary: 'Akademik ish',
    description: 'Darslarni rejalashtiring, baholarni qo\'ying, uy vazifalarini tekshiring va o\'quvchilar rivojlanishini kuzating.',
    metrics: ['Baholash tizimi', 'Dars rejalari', 'O\'quvchi progressi'],
  },
  {
    icon: UserCircle,
    title: 'Ota-ona',
    summary: 'Shaffof kuzatuv',
    description: 'Farzandingizning davomati, baholari, to\'lov holati va maktab yangiliklarini real vaqtda ko\'ring.',
    metrics: ['Davomat xabarnomalari', 'To\'lov holati', 'Dars jadvali'],
  },
  {
    icon: BarChart3,
    title: 'O\'quvchi',
    summary: 'Shaxsiy rivojlanish',
    description: 'Dars jadvallarini ko\'ring, uy vazifalarini bajaring, baholaringizni kuzating va o\'z rivojlanishingizni tahlil qiling.',
    metrics: ['Dars jadvali', 'Uy vazifalari', 'Baholar tahlili'],
  },
];

export function RolesSection() {
  return (
    <section id="rollar" className="bg-white dark:bg-xedu-slate-950">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <SectionHeader
          label="Rollar"
          title="Har bir rolda samaradorlik"
          description="Xedu platformasi har bir foydalanuvchi turiga mos interfeys va imkoniyatlarni taqdim etadi."
        />

        <div className="mt-14 space-y-4">
          {roles.map((role) => (
            <div
              key={role.title}
              className="group rounded-2xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg dark:bg-xedu-slate-900/50 overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-8">
                  {/* Role identity */}
                  <div className="shrink-0 flex items-center gap-3 sm:w-48">
                    <div className="h-10 w-10 rounded-xl bg-xedu-primary-muted dark:bg-xedu-primary/10 flex items-center justify-center">
                      <role.icon className="h-5 w-5 text-xedu-primary" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-xedu-slate-900 dark:text-white">
                        {role.title}
                      </h3>
                      <p className="text-[11px] text-xedu-slate-400">{role.summary}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex-1">
                    <p className="text-[13px] leading-relaxed text-xedu-slate-600 dark:text-xedu-slate-400">
                      {role.description}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="shrink-0 flex flex-wrap sm:flex-col gap-2 sm:w-44">
                    {role.metrics.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-xedu-slate-800 border border-xedu-slate-100 dark:border-xedu-slate-700 text-[11px] text-xedu-slate-600 dark:text-xedu-slate-400"
                      >
                        <span className="h-1 w-1 rounded-full bg-xedu-primary" />
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
