'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Atmospheric depth: ultra-subtle radial gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-xedu-primary/[0.015] blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-xedu-slate-100/50 blur-3xl -translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Micro-dot texture */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #0F172A 1px, transparent 0)`, backgroundSize: '48px 48px' }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-36 pb-24 sm:pt-48 sm:pb-36">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-xedu-slate-50 border border-xedu-slate-100/80 mb-10 shadow-premium-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-xedu-primary opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-xedu-primary" />
              </span>
              <span className="text-[11px] font-semibold text-xedu-slate-600 tracking-wide uppercase">
                Operatsion tizim
              </span>
            </div>

            <h1 className="text-[2.75rem] sm:text-[3.25rem] lg:text-[3.75rem] font-bold tracking-[-0.03em] text-xedu-slate-950 leading-[1.08]">
              Ta'lim guruhi uchun{' '}
              <span className="text-xedu-primary">operatsion tizim</span>
            </h1>

            <p className="mt-7 text-lg text-xedu-slate-500 leading-[1.65] max-w-md">
              Akademik jarayonlar, operatsion boshqaruv, moliya, aloqa va 
              analitikani barcha filiallar uchun birlashtirilgan platformadan boshqaring.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <a href="#demo">
                <Button
                  size="lg"
                  className="h-12 px-8 text-[13px] font-semibold bg-xedu-primary hover:bg-xedu-primary-hover shadow-premium-md transition-all duration-200 hover:shadow-premium-lg"
                >
                  Demo so'rash
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#platforma">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-[13px] font-semibold border-xedu-slate-200 hover:bg-xedu-slate-50 hover:border-xedu-slate-300 transition-all duration-200"
                >
                  <Play className="mr-2 h-4 w-4 text-xedu-slate-400" />
                  Platformani ko'rish
                </Button>
              </a>
            </div>

            <div className="mt-12 flex items-center gap-8">
              {[
                { label: 'ERP + LMS + CRM', desc: 'Yagona platforma' },
                { label: 'Ko‘p filial', desc: 'Markaziy boshqaruv' },
                { label: 'Real-time', desc: 'Operatsion analitika' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[13px] font-semibold text-xedu-slate-700">{item.label}</p>
                  <p className="text-[11px] text-xedu-slate-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Premium product visualization */}
          <div className="relative hidden lg:block">
            {/* Outer atmospheric glow */}
            <div className="absolute -inset-8 rounded-[2.5rem] bg-xedu-primary/[0.02] blur-2xl" />

            <div className="relative rounded-[1.5rem] shadow-premium-xl overflow-hidden bg-white">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-xedu-slate-100 bg-white">
                <span className="h-3 w-3 rounded-full bg-xedu-slate-100" />
                <span className="h-3 w-3 rounded-full bg-xedu-slate-100" />
                <span className="h-3 w-3 rounded-full bg-xedu-slate-100" />
                <div className="ml-4 flex-1 h-7 rounded-md bg-xedu-slate-50 border border-xedu-slate-100 flex items-center px-3">
                  <span className="text-[10px] text-xedu-slate-400 tracking-wide">xedu.uz/dashboard</span>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-6 space-y-5 bg-gradient-to-b from-white to-xedu-slate-50/30">
                {/* Top stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'O‘quvchilar', value: '1,248', sub: '+12% oylik' },
                    { label: 'Filiallar', value: '8 ta', sub: '2 ta yangi' },
                    { label: 'Davomat', value: '94.2%', sub: '+1.3% haftalik' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-white shadow-premium-sm p-4 border border-xedu-slate-100/50">
                      <p className="text-[10px] font-medium text-xedu-slate-400 uppercase tracking-wider">{stat.label}</p>
                      <p className="mt-1.5 text-xl font-bold text-xedu-slate-900 tracking-tight">{stat.value}</p>
                      <p className="mt-0.5 text-[10px] text-xedu-primary font-medium">{stat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="rounded-xl bg-white shadow-premium-sm p-5 border border-xedu-slate-100/50">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[12px] font-semibold text-xedu-slate-800">Oylik davomat dinamikasi</p>
                      <p className="text-[10px] text-xedu-slate-400 mt-0.5">Barcha filiallar bo'yicha</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-xedu-slate-400 px-2 py-1 rounded-md bg-xedu-slate-50">6 oy</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-[6px] h-24 px-1">
                    {[58, 65, 61, 72, 78, 85, 82, 88, 91, 94].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end group">
                        <div className="w-full rounded-t-[3px] bg-xedu-primary/8 relative overflow-hidden" style={{ height: `${Math.max(h * 0.85, 12)}%` }}>
                          <div className="absolute bottom-0 left-0 right-0 rounded-t-[3px] bg-xedu-primary transition-all duration-300 group-hover:bg-xedu-primary-hover" style={{ height: `${(h / 100) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 px-1">
                    {['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn'].map((m) => (
                      <span key={m} className="text-[9px] text-xedu-slate-400 font-medium">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white shadow-premium-sm p-4 border border-xedu-slate-100/50">
                    <p className="text-[10px] font-medium text-xedu-slate-400 uppercase tracking-wider mb-3">To'lov holati</p>
                    <div className="flex items-center gap-4">
                      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#0F7B53" strokeWidth="3" strokeDasharray="82 100" strokeLinecap="round" />
                      </svg>
                      <div>
                        <p className="text-xl font-bold text-xedu-slate-900">82%</p>
                        <p className="text-[10px] text-xedu-slate-400">234 / 285 o'quvchi</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white shadow-premium-sm p-4 border border-xedu-slate-100/50">
                    <p className="text-[10px] font-medium text-xedu-slate-400 uppercase tracking-wider mb-3">Bugungi darslar</p>
                    <div className="space-y-2.5">
                      {[
                        { subject: 'Matematika', time: '08:00', room: '201' },
                        { subject: 'Fizika', time: '10:00', room: '105' },
                        { subject: 'Ingliz tili', time: '12:00', room: '302' },
                      ].map((s) => (
                        <div key={s.subject} className="flex items-center gap-2.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-xedu-primary shrink-0" />
                          <span className="text-[11px] text-xedu-slate-600 font-medium flex-1">{s.subject}</span>
                          <span className="text-[10px] text-xedu-slate-400 tabular-nums">{s.time}</span>
                          <span className="text-[9px] text-xedu-slate-300">{s.room}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
