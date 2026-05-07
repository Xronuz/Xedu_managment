'use client';

import { SectionHeader } from './section-header';
import { Network, Eye, BarChart3, Users, CheckCircle2 } from 'lucide-react';

const capabilities = [
  {
    icon: Eye,
    title: 'Markaziy nazorat',
    description: 'Barcha filiallarning operatsion holatini yagona dashboarddan kuzating.',
  },
  {
    icon: BarChart3,
    title: 'Filial taqqoslash',
    description: 'Filiallar o\'rtasida davomat, moliya va akademik natijalarni taqqoslang.',
  },
  {
    icon: Users,
    title: 'Xodimlar ko\'chirish',
    description: 'O\'qituvchi va xodimlarni filiallar o\'rtasida tez va oson joylashtiring.',
  },
  {
    icon: Network,
    title: 'Masshtablash',
    description: 'Yangi filiallarni bir necha daqiqada tizimga ulang va standartlarni joriy eting.',
  },
];

export function MultibranchSection() {
  return (
    <section id="filial" className="bg-white dark:bg-xedu-slate-950">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-xedu-primary mb-4">
              Ko'p filial boshqaruvi
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-xedu-slate-900 dark:text-white leading-tight">
              Har bir filial nazoratingiz ostida
            </h2>
            <p className="mt-5 text-base text-xedu-slate-500 dark:text-xedu-slate-400 leading-relaxed">
              Ta'lim guruhlari o'sishda davom etadi. Xedu sizning infratuzilmangizni 
              o'sishga moslashtiradi — yangi filiallarni qo'shish endi murakkablik 
              emas, balki standart jarayon.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                'Har bir filial uchun alohida byudjet va hisobot',
                'Filiallar o\'rtasida o\'quvchi va xodimlar harakati',
                'Markaziy ota-onalar bazasi va aloqa markazi',
                'Filial darajasida ruxsatlar va rollar boshqaruvi',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-xedu-primary shrink-0 mt-0.5" />
                  <span className="text-[13px] text-xedu-slate-600 dark:text-xedu-slate-400">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Visual */}
          <div className="relative">
            <div className="rounded-2xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg dark:bg-xedu-slate-900 p-6 space-y-4">
              {/* Headquarters */}
              <div className="p-4 rounded-xl bg-white dark:bg-xedu-slate-900 border border-xedu-primary/20 dark:border-xedu-primary/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-xedu-primary flex items-center justify-center">
                    <Network className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-xedu-slate-900 dark:text-white">Markaziy ofis</p>
                    <p className="text-[11px] text-xedu-slate-400">Barcha filiallar boshqaruvi</p>
                  </div>
                </div>
              </div>

              {/* Connection lines */}
              <div className="flex justify-center">
                <div className="h-6 w-px bg-xedu-slate-200 dark:bg-xedu-slate-700" />
              </div>

              {/* Branches */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Chilonzor filiali', students: 320, staff: 28 },
                  { name: 'Yunusobod filiali', students: 410, staff: 35 },
                  { name: 'Sergeli filiali', students: 280, staff: 22 },
                  { name: 'Yakkasaroy filiali', students: 238, staff: 19 },
                ].map((branch) => (
                  <div
                    key={branch.name}
                    className="p-3 rounded-lg bg-white dark:bg-xedu-slate-900 border border-xedu-slate-100 dark:border-xedu-slate-800"
                  >
                    <p className="text-[12px] font-semibold text-xedu-slate-800 dark:text-xedu-slate-200 truncate">
                      {branch.name}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[10px] text-xedu-slate-400">
                        {branch.students} o'quvchi
                      </span>
                      <span className="text-[10px] text-xedu-slate-400">
                        {branch.staff} xodim
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorative */}
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-xedu-primary/5 dark:bg-xedu-primary/10 blur-xl" />
          </div>
        </div>

        {/* Capability cards */}
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="p-5 rounded-xl bg-xedu-bg dark:bg-xedu-slate-900/50 border border-xedu-slate-100 dark:border-xedu-slate-800"
            >
              <cap.icon className="h-5 w-5 text-xedu-primary mb-3" />
              <h3 className="text-[14px] font-semibold text-xedu-slate-900 dark:text-white">
                {cap.title}
              </h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-xedu-slate-500 dark:text-xedu-slate-400">
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
