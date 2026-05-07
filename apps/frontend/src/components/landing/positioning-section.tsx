'use client';

import { SectionHeader } from './section-header';

const pillars = [
  {
    title: 'ERP',
    description: 'Kadrlar, moliya, ta\'minot va operatsion jarayonlarni boshqarish.',
  },
  {
    title: 'LMS',
    description: 'Dars jadvali, baholash, uy vazifalari va akademik kuzatuv.',
  },
  {
    title: 'CRM',
    description: 'Abiturientlar bilan ishlash, leads va ota-onalar aloqasi.',
  },
  {
    title: 'Finance',
    description: 'To\'lovlar, byudjet, ish haqi va moliyaviy hisobotlar.',
  },
  {
    title: 'Analytics',
    description: 'Operatsion ko\'rsatkichlar, KPI va strategik qarorlar uchun ma\'lumotlar.',
  },
  {
    title: 'Governance',
    description: 'Ruxsatlar ierarxiyasi, audit jurnali va institutsional nazorat.',
  },
];

export function PositioningSection() {
  return (
    <section id="platforma" className="bg-white dark:bg-xedu-slate-950">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <SectionHeader
          label="Platforma"
          title="Bitta platforma. Har tomonlama boshqaruv."
          description="Xedu alohida tizimlarni birlashtiradi. Ta'lim tashkiloti uchun zarur bo'lgan barcha funksiyalar bir joyda."
        />

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.title}
              className="group relative p-6 rounded-2xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg dark:bg-xedu-slate-900/50 hover:border-xedu-primary/20 dark:hover:border-xedu-primary/30 transition-colors duration-150"
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold text-xedu-slate-300 dark:text-xedu-slate-600 uppercase tracking-wider">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-xl font-bold text-xedu-slate-900 dark:text-white">
                  {pillar.title}
                </span>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-xedu-slate-500 dark:text-xedu-slate-400">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* Integration visual */}
        <div className="mt-14 rounded-2xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg dark:bg-xedu-slate-900/30 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 flex-wrap">
            {['ERP', 'LMS', 'CRM', 'Finance', 'Analytics', 'Governance'].map((item, i, arr) => (
              <div key={item} className="flex items-center gap-4 sm:gap-6">
                <div className="px-5 py-2.5 rounded-lg bg-white dark:bg-xedu-slate-900 border border-xedu-slate-100 dark:border-xedu-slate-800 shadow-sm">
                  <span className="text-[13px] font-semibold text-xedu-slate-700 dark:text-xedu-slate-300">
                    {item}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden sm:block h-px w-6 bg-xedu-slate-200 dark:bg-xedu-slate-700" />
                )}
              </div>
            ))}
          </div>
          <p className="text-center mt-6 text-[12px] text-xedu-slate-400 dark:text-xedu-slate-500">
            Barcha modullar yagona ma'lumotlar bazasi va ruxsatlar tizimida ishlaydi
          </p>
        </div>
      </div>
    </section>
  );
}
