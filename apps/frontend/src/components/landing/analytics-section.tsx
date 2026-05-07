'use client';

import { SectionHeader } from './section-header';

const insights = [
  {
    title: 'Davomat analitikasi',
    description: 'Kunlik, haftalik va oylik davomat dinamikasi. O\'quvchilar, guruhlar va filiallar kesimida tahlil.',
    metric: '94.2%',
    label: 'O\'rtacha davomat',
  },
  {
    title: 'Moliyaviy oversight',
    description: 'To\'lov holati, qarzdorlik, byudjet bajarilishi va filial daromadi real vaqtda.',
    metric: '97%',
    label: 'To\'lov yig\'ilishi',
  },
  {
    title: 'O\'quv natijalari',
    description: 'Fanlar kesimida o\'rtacha baholar, o\'quvchilar rivojlanishi va o\'qituvchi samaradorligi.',
    metric: '4.2/5',
    label: 'O\'rtacha baho',
  },
  {
    title: 'Xodimlar KPI',
    description: 'O\'qituvchilar yuklamasi, dars o\'tish sifati va administrativ samaradorlik ko\'rsatkichlari.',
    metric: '86%',
    label: 'KPI bajarilishi',
  },
];

export function AnalyticsSection() {
  return (
    <section className="bg-xedu-bg dark:bg-xedu-slate-950 border-y border-xedu-slate-100 dark:border-xedu-slate-800/50">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <SectionHeader
          label="Analitika"
          title="Ma'lumotlar asosida boshqaruv"
          description="Real vaqtli analitika orqali institutsional qarorlarni qabul qiling. Xedu barcha ma'lumotlarni birlashtiradi va tushunarli ko'rinishda taqdim etadi."
        />

        <div className="mt-14 grid sm:grid-cols-2 gap-5">
          {insights.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-2xl bg-white dark:bg-xedu-slate-900 border border-xedu-slate-100 dark:border-xedu-slate-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-xedu-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-xedu-slate-500 dark:text-xedu-slate-400 max-w-xs">
                    {item.description}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-2xl font-bold text-xedu-slate-900 dark:text-white">{item.metric}</p>
                  <p className="text-[11px] text-xedu-slate-400 mt-0.5">{item.label}</p>
                </div>
              </div>

              {/* Mini sparkline visualization */}
              <div className="mt-5 flex items-end gap-1 h-10">
                {[40, 55, 45, 70, 60, 80, 75, 90, 85, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-xedu-primary/10 dark:bg-xedu-primary/20 overflow-hidden">
                    <div
                      className="w-full rounded-sm bg-xedu-primary/40 dark:bg-xedu-primary/50"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
