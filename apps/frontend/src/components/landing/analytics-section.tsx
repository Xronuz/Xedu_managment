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

function Sparkline({ data, color = 'xedu-primary' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-14" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#grad-${color})`}
        className="text-xedu-primary"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-xedu-primary"
      />
    </svg>
  );
}

const sparklineData = [
  [42, 48, 45, 55, 52, 60, 58, 65, 70, 68, 75, 82],
  [30, 35, 32, 40, 45, 42, 50, 55, 60, 65, 70, 75],
  [55, 58, 56, 60, 62, 65, 63, 68, 70, 72, 75, 78],
  [60, 62, 58, 65, 68, 70, 72, 75, 78, 80, 82, 86],
];

export function AnalyticsSection() {
  return (
    <section className="relative surface-atmospheric overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32">
        <SectionHeader
          label="Analitika"
          title="Ma'lumotlar asosida boshqaruv"
          description="Real vaqtli analitika orqali institutsional qarorlarni qabul qiling. Xedu barcha ma'lumotlarni birlashtiradi va tushunarli ko'rinishda taqdim etadi."
        />

        <div className="mt-16 grid sm:grid-cols-2 gap-5">
          {insights.map((item, i) => (
            <div
              key={item.title}
              className="group relative rounded-2xl bg-white shadow-premium-sm hover:shadow-premium-md transition-all duration-300 p-7"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/40 to-transparent rounded-t-2xl" />

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-xedu-slate-900 tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.7] text-xedu-slate-500 max-w-sm">
                    {item.description}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-6">
                  <p className="text-2xl font-bold text-xedu-slate-900 tracking-tight">{item.metric}</p>
                  <p className="text-[11px] text-xedu-slate-400 mt-1">{item.label}</p>
                </div>
              </div>

              <div className="mt-6 -mx-1">
                <Sparkline data={sparklineData[i]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
