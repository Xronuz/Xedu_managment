'use client';

import { Network, Eye, BarChart3, Users, CheckCircle2 } from 'lucide-react';

const capabilities = [
  { icon: Eye, title: 'Markaziy nazorat', description: 'Barcha filiallarning operatsion holatini yagona dashboarddan kuzating.' },
  { icon: BarChart3, title: 'Filial taqqoslash', description: 'Filiallar o‘rtasida davomat, moliya va akademik natijalarni taqqoslang.' },
  { icon: Users, title: 'Xodimlar ko‘chirish', description: 'O‘qituvchi va xodimlarni filiallar o‘rtasida tez va oson joylashtiring.' },
  { icon: Network, title: 'Masshtablash', description: 'Yangi filiallarni bir necha daqiqada tizimga ulang va standartlarni joriy eting.' },
];

export function MultibranchSection() {
  return (
    <section id="filial" className="relative bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-xedu-primary mb-5">
              Ko'p filial boshqaruvi
            </span>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-[-0.025em] text-xedu-slate-950 leading-[1.15]">
              Har bir filial nazoratingiz ostida
            </h2>
            <p className="mt-6 text-base text-xedu-slate-500 leading-[1.7]">
              Ta'lim guruhlari o'sishda davom etadi. Xedu sizning infratuzilmangizni 
              o'sishga moslashtiradi — yangi filiallarni qo'shish endi murakkablik 
              emas, balki standart jarayon.
            </p>

            <ul className="mt-10 space-y-4">
              {[
                'Har bir filial uchun alohida byudjet va hisobot',
                'Filiallar o‘rtasida o‘quvchi va xodimlar harakati',
                'Markaziy ota-onalar bazasi va aloqa markazi',
                'Filial darajasida ruxsatlar va rollar boshqaruvi',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3.5">
                  <CheckCircle2 className="h-5 w-5 text-xedu-primary/70 shrink-0 mt-0.5" />
                  <span className="text-[13px] text-xedu-slate-600 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-xedu-primary/[0.02] blur-2xl" />

            <div className="relative rounded-[1.5rem] shadow-premium-lg overflow-hidden bg-white border border-xedu-slate-100/50 p-6 space-y-5">
              <div className="p-5 rounded-xl bg-gradient-to-b from-white to-xedu-slate-50/50 border border-xedu-slate-100/50 shadow-premium-sm">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-lg bg-xedu-primary flex items-center justify-center shadow-premium-sm">
                    <Network className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-xedu-slate-900">Markaziy ofis</p>
                    <p className="text-[11px] text-xedu-slate-400">Barcha filiallar boshqaruvi</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="h-7 w-px bg-xedu-slate-200/70" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Chilonzor', students: 320, staff: 28 },
                  { name: 'Yunusobod', students: 410, staff: 35 },
                  { name: 'Sergeli', students: 280, staff: 22 },
                  { name: 'Yakkasaroy', students: 238, staff: 19 },
                ].map((branch) => (
                  <div
                    key={branch.name}
                    className="p-4 rounded-xl bg-white border border-xedu-slate-100/50 shadow-premium-sm"
                  >
                    <p className="text-[12px] font-semibold text-xedu-slate-800 truncate">{branch.name}</p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <span className="text-[10px] text-xedu-slate-400 font-medium">{branch.students} o'quvchi</span>
                      <span className="text-[10px] text-xedu-slate-400 font-medium">{branch.staff} xodim</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="relative rounded-2xl bg-white shadow-premium-sm p-6 group hover:shadow-premium-md transition-all duration-300"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/40 to-transparent rounded-t-2xl" />
              <cap.icon className="h-5 w-5 text-xedu-primary mb-4" />
              <h3 className="text-[14px] font-semibold text-xedu-slate-900 tracking-tight">{cap.title}</h3>
              <p className="mt-2 text-[12px] leading-[1.7] text-xedu-slate-500">{cap.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
