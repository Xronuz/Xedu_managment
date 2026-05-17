'use client';

import { BrainCircuit, TrendingDown, AlertTriangle, Lightbulb, ShieldCheck } from 'lucide-react';

const aiCapabilities = [
  { icon: TrendingDown, title: 'O‘quvchi xavfi', description: 'Davomat pasayishi yoki baho tomomilari o‘zgarishida xavfli o‘quvchilarni aniqlash.' },
  { icon: AlertTriangle, title: 'Moliyaviy anomaliyalar', description: 'Kutilmagan to‘lov kechikishlari yoki xarajat anomaliyalarini avtomatik aniqlash.' },
  { icon: Lightbulb, title: 'Tavsiyalar', description: 'O‘qituvchi yuklamasi, dars jadvallari va resurslarni optimallashtirish bo‘yicha tavsiyalar.' },
  { icon: ShieldCheck, title: 'Xavfsizlik monitoring', description: 'G‘alati kirish urinishlari va maxfiylik buzilishlarini real vaqtda aniqlash.' },
];

export function AiSection() {
  return (
    <section className="relative bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl shadow-premium-lg overflow-hidden bg-white border border-xedu-slate-100/50 p-6 space-y-4">
              {[
                { icon: AlertTriangle, color: 'xedu-amber', title: 'Davomat ogohlantirishi', text: '9-A sinfida oylik davomat 87% gacha tushdi. Tavsiya: sinf rahbari bilan suhbat.', time: '2 soat oldin' },
                { icon: Lightbulb, color: 'xedu-primary', title: 'Resurs optimallashtirish', text: 'Dushanba ertalabki darslarda xonalar 62% band. Tavsiya: jadvallarni qayta ko‘rib chiqish.', time: 'Bugun' },
                { icon: TrendingDown, color: 'xedu-sky', title: 'O‘quvchi xavfi', text: 'Aziz Karimovning o‘rtacha bahosi 2 oy ichida 4.2 dan 3.1 gacha tushdi.', time: 'Kecha' },
              ].map((alert) => (
                <div
                  key={alert.title}
                  className="p-4 rounded-xl bg-white border border-xedu-slate-100/50 shadow-premium-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 h-8 w-8 rounded-lg bg-${alert.color}/[0.08] flex items-center justify-center`}>
                      <alert.icon className={`h-4 w-4 text-${alert.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-xedu-slate-800">{alert.title}</p>
                      <p className="mt-1 text-[11px] text-xedu-slate-500 leading-relaxed">{alert.text}</p>
                    </div>
                    <span className="text-[10px] text-xedu-slate-400 shrink-0">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-xedu-primary mb-5">
              Sun'iy intellekt
            </span>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-[-0.025em] text-xedu-slate-950 leading-[1.15]">
              Ma'lumotlar sizga gapiradi
            </h2>
            <p className="mt-6 text-base text-xedu-slate-500 leading-[1.7]">
              Xedu platformasiga integral qilingan AI vositalari ma'lumotlarni tahlil qiladi, 
              tendensiyalarni aniqlaydi va operatsion qarorlar qabul qilishda yordam beradi.
            </p>

            <div className="mt-10 space-y-5">
              {aiCapabilities.map((cap) => (
                <div key={cap.title} className="flex items-start gap-4">
                  <div className="shrink-0 h-9 w-9 rounded-xl bg-xedu-primary/[0.06] flex items-center justify-center">
                    <cap.icon className="h-4 w-4 text-xedu-primary" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-xedu-slate-900 tracking-tight">{cap.title}</h3>
                    <p className="mt-1 text-[12px] text-xedu-slate-500 leading-[1.7]">{cap.description}</p>
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
