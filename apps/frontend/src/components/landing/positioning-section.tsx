'use client';

import { SectionHeader } from './section-header';

const pillars = [
  { title: 'ERP', description: 'Kadrlar, moliya, ta\'minot va operatsion jarayonlarni boshqarish.' },
  { title: 'LMS', description: 'Dars jadvali, baholash, uy vazifalari va akademik kuzatuv.' },
  { title: 'CRM', description: 'Abiturientlar bilan ishlash, leads va ota-onalar aloqasi.' },
  { title: 'Finance', description: 'To\'lovlar, byudjet, ish haqi va moliyaviy hisobotlar.' },
  { title: 'Analytics', description: 'Operatsion ko\'rsatkichlar, KPI va strategik qarorlar uchun ma\'lumotlar.' },
  { title: 'Governance', description: 'Ruxsatlar ierarxiyasi, audit jurnali va institutsional nazorat.' },
];

export function PositioningSection() {
  return (
    <section id="platforma" className="relative bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32">
        <SectionHeader
          label="Platforma"
          title="Bitta platforma. Har tomonlama boshqaruv."
          description="Xedu alohida tizimlarni birlashtiradi. Ta'lim tashkiloti uchun zarur bo'lgan barcha funksiyalar bir joyda."
        />

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.title}
              className="group relative rounded-2xl bg-white shadow-premium-sm hover:shadow-premium-md transition-all duration-300 p-7"
            >
              {/* Subtle top edge highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/40 to-transparent rounded-t-2xl" />

              <div className="flex items-baseline justify-between mb-5">
                <span className="text-[11px] font-bold text-xedu-slate-300 uppercase tracking-[0.12em]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-lg font-bold text-xedu-slate-900 tracking-tight">
                  {pillar.title}
                </span>
              </div>
              <p className="text-[13px] leading-[1.7] text-xedu-slate-500">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* Integration visual */}
        <div className="mt-16 rounded-2xl surface-elevated p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 flex-wrap">
            {['ERP', 'LMS', 'CRM', 'Finance', 'Analytics', 'Governance'].map((item, i, arr) => (
              <div key={item} className="flex items-center gap-3 sm:gap-5">
                <div className="px-5 py-2.5 rounded-xl bg-white shadow-premium-sm border border-xedu-slate-100/50">
                  <span className="text-[13px] font-semibold text-xedu-slate-700">{item}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden sm:block h-px w-8 bg-xedu-slate-200/70" />
                )}
              </div>
            ))}
          </div>
          <p className="text-center mt-7 text-[12px] text-xedu-slate-400 tracking-wide">
            Barcha modullar yagona ma'lumotlar bazasi va ruxsatlar tizimida ishlaydi
          </p>
        </div>
      </div>
    </section>
  );
}
