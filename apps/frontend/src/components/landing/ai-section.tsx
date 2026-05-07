'use client';

import { SectionHeader } from './section-header';
import { BrainCircuit, TrendingDown, AlertTriangle, Lightbulb, ShieldCheck } from 'lucide-react';

const aiCapabilities = [
  {
    icon: TrendingDown,
    title: 'O\'quvchi xavfi',
    description: 'Davomat pasayishi yoki baho tomomilari o\'zgarishida xavfli o\'quvchilarni aniqlash.',
  },
  {
    icon: AlertTriangle,
    title: 'Moliyaviy anomaliyalar',
    description: 'Kutilmagan to\'lov kechikishlari yoki xarajat anomaliyalarini avtomatik aniqlash.',
  },
  {
    icon: Lightbulb,
    title: 'Tavsiyalar',
    description: 'O\'qituvchi yuklamasi, dars jadvallari va resurslarni optimallashtirish bo\'yicha tavsiyalar.',
  },
  {
    icon: ShieldCheck,
    title: 'Xavfsizlik monitoring',
    description: 'G\'alati kirish urinishlari va maxfiylik buzilishlarini real vaqtda aniqlash.',
  },
];

export function AiSection() {
  return (
    <section className="bg-white dark:bg-xedu-slate-950">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Left: Visual */}
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg dark:bg-xedu-slate-900 p-6 space-y-4">
              {/* AI Insight Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-xedu-slate-900 border border-xedu-amber/20 dark:border-xedu-amber/20">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-xedu-amber/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-xedu-amber" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-xedu-slate-800 dark:text-xedu-slate-200">
                      Davomat ogohlantirishi
                    </p>
                    <p className="mt-1 text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400">
                      9-A sinfida oylik davomat 87% gacha tushdi. Tavsiya: sinf rahbari bilan suhbat.
                    </p>
                  </div>
                  <span className="text-[10px] text-xedu-slate-400 shrink-0">2 soat oldin</span>
                </div>
              </div>

              {/* AI Insight Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-xedu-slate-900 border border-xedu-primary/20 dark:border-xedu-primary/20">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-xedu-primary-muted flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-xedu-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-xedu-slate-800 dark:text-xedu-slate-200">
                      Resurs optimallashtirish
                    </p>
                    <p className="mt-1 text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400">
                      Dushanba ertalabki darslarda xonalar 62% band. Tavsiya: jadvallarni qayta ko'rib chiqish.
                    </p>
                  </div>
                  <span className="text-[10px] text-xedu-slate-400 shrink-0">Bugun</span>
                </div>
              </div>

              {/* AI Insight Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-xedu-slate-900 border border-xedu-sky/20 dark:border-xedu-sky/20">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-xedu-sky/10 flex items-center justify-center">
                    <TrendingDown className="h-4 w-4 text-xedu-sky" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-xedu-slate-800 dark:text-xedu-slate-200">
                      O\'quvchi xavfi
                    </p>
                    <p className="mt-1 text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400">
                      Aziz Karimovning o'rtacha bahosi 2 oy ichida 4.2 dan 3.1 gacha tushdi.
                    </p>
                  </div>
                  <span className="text-[10px] text-xedu-slate-400 shrink-0">Kecha</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Copy */}
          <div className="order-1 lg:order-2">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-xedu-primary mb-4">
              Sun'iy intellekt
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-xedu-slate-900 dark:text-white leading-tight">
              Ma'lumotlar sizga gapiradi
            </h2>
            <p className="mt-5 text-base text-xedu-slate-500 dark:text-xedu-slate-400 leading-relaxed">
              Xedu platformasiga integral qilingan AI vositalari ma'lumotlarni tahlil qiladi, 
              tendensiyalarni aniqlaydi va operatsion qarorlar qabul qilishda yordam beradi.
            </p>

            <div className="mt-10 space-y-4">
              {aiCapabilities.map((cap) => (
                <div key={cap.title} className="flex items-start gap-3">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-xedu-primary-muted dark:bg-xedu-primary/10 flex items-center justify-center">
                    <cap.icon className="h-4 w-4 text-xedu-primary" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-xedu-slate-900 dark:text-white">
                      {cap.title}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-xedu-slate-500 dark:text-xedu-slate-400 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
