'use client';

import { SectionHeader } from './section-header';
import { BarChart3, Users, GraduationCap, UserCircle, School } from 'lucide-react';

const roles = [
  {
    icon: School,
    title: 'Direktor',
    summary: 'Strategik nazorat',
    description: 'Barcha filiallarning operatsion ko‘rsatkichlarini real vaqtda ko‘ring. Moliyaviy holat, davomat dinamikasi va xodimlar samaradorligi uchun yagona oyna.',
    metrics: ['KPI dashboard', 'Filial taqqoslash', 'Moliyaviy hisobot'],
  },
  {
    icon: Users,
    title: 'Filial boshlig‘i',
    summary: 'Operatsion boshqaruv',
    description: 'O‘z filialingizning barcha jarayonlarini boshqaring. Dars jadvallari, xodimlar nazorati, ota-onalar aloqasi va kunlik operatsiyalar.',
    metrics: ['Dars jadvali', 'Xodimlar nazorati', 'Davomat monitoring'],
  },
  {
    icon: GraduationCap,
    title: 'O‘qituvchi',
    summary: 'Akademik ish',
    description: 'Darslarni rejalashtiring, baholarni qo‘ying, uy vazifalarini tekshiring va o‘quvchilar rivojlanishini kuzating.',
    metrics: ['Baholash tizimi', 'Dars rejalari', 'O‘quvchi progressi'],
  },
  {
    icon: UserCircle,
    title: 'Ota-ona',
    summary: 'Shaffof kuzatuv',
    description: 'Farzandingizning davomati, baholari, to‘lov holati va maktab yangiliklarini real vaqtda ko‘ring.',
    metrics: ['Davomat xabarnomalari', 'To‘lov holati', 'Dars jadvali'],
  },
  {
    icon: BarChart3,
    title: 'O‘quvchi',
    summary: 'Shaxsiy rivojlanish',
    description: 'Dars jadvallarini ko‘ring, uy vazifalarini bajaring, baholaringizni kuzating va o‘z rivojlanishingizni tahlil qiling.',
    metrics: ['Dars jadvali', 'Uy vazifalari', 'Baholar tahlili'],
  },
];

export function RolesSection() {
  return (
    <section id="rollar" className="relative bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32">
        <SectionHeader
          label="Rollar"
          title="Har bir rolda samaradorlik"
          description="Xedu platformasi har bir foydalanuvchi turiga mos interfeys va imkoniyatlarni taqdim etadi."
        />

        <div className="mt-16 space-y-4">
          {roles.map((role) => (
            <div
              key={role.title}
              className="group relative rounded-2xl bg-white shadow-premium-sm hover:shadow-premium-md transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/40 to-transparent" />

              <div className="p-7 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-8">
                  <div className="shrink-0 flex items-center gap-3 sm:w-48">
                    <div className="h-10 w-10 rounded-xl bg-xedu-primary/[0.06] flex items-center justify-center">
                      <role.icon className="h-5 w-5 text-xedu-primary" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-xedu-slate-900 tracking-tight">{role.title}</h3>
                      <p className="text-[11px] text-xedu-slate-400 mt-0.5">{role.summary}</p>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-[13px] leading-[1.7] text-xedu-slate-600">
                      {role.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-wrap sm:flex-col gap-2 sm:w-44">
                    {role.metrics.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xedu-slate-50 border border-xedu-slate-100/60 text-[11px] text-xedu-slate-600 font-medium"
                      >
                        <span className="h-1 w-1 rounded-full bg-xedu-primary/60" />
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
