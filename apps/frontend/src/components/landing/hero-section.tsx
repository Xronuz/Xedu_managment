'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-xedu-slate-950">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-xedu-primary-muted dark:bg-xedu-primary/10 border border-xedu-primary/10 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-xedu-primary animate-pulse" />
              <span className="text-[11px] font-semibold text-xedu-primary tracking-wide">
                Ta'lim tashkilotlari uchun operatsion tizim
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-xedu-slate-900 dark:text-white leading-[1.1]">
              Ta'lim guruhi uchun{' '}
              <span className="text-xedu-primary">operatsion tizim</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-xedu-slate-500 dark:text-xedu-slate-400 leading-relaxed max-w-md">
              Akademik jarayonlar, operatsion boshqaruv, moliya, aloqa va analitikani 
              barcha filiallar uchun birlashtirilgan platformadan boshqaring.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <a href="#demo">
                <Button
                  size="lg"
                  className="h-12 px-7 text-[13px] font-semibold bg-xedu-primary hover:bg-xedu-primary-hover shadow-sm"
                >
                  Demo so'rash
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#platforma">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-7 text-[13px] font-semibold border-xedu-slate-200 dark:border-xedu-slate-700"
                >
                  <Play className="mr-2 h-4 w-4 text-xedu-slate-400" />
                  Platformani ko'rish
                </Button>
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-[11px] text-xedu-slate-400 dark:text-xedu-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-xedu-slate-300" />
                ERP + LMS + CRM
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-xedu-slate-300" />
                Ko'p filial
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-xedu-slate-300" />
                Real-time analytics
              </span>
            </div>
          </div>

          {/* Right: Abstract platform visual */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-bg dark:bg-xedu-slate-900 shadow-xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900">
                <span className="h-2.5 w-2.5 rounded-full bg-xedu-slate-200 dark:bg-xedu-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-xedu-slate-200 dark:bg-xedu-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-xedu-slate-200 dark:bg-xedu-slate-700" />
                <div className="ml-3 flex-1 h-6 rounded-md bg-xedu-slate-50 dark:bg-xedu-slate-800 flex items-center px-2.5">
                  <span className="text-[10px] text-xedu-slate-400">xedu.uz/dashboard</span>
                </div>
              </div>

              {/* Dashboard mockup content */}
              <div className="p-5 space-y-4">
                {/* Top stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'O\'quvchilar', value: '1,248', change: '+12%' },
                    { label: 'Filiallar', value: '8', change: '+2' },
                    { label: 'Davomat', value: '94.2%', change: '+1.3%' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-3"
                    >
                      <p className="text-[10px] text-xedu-slate-400 mb-1">{stat.label}</p>
                      <p className="text-lg font-bold text-xedu-slate-900 dark:text-white">{stat.value}</p>
                      <p className="text-[10px] text-xedu-primary mt-0.5">{stat.change}</p>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold text-xedu-slate-700 dark:text-xedu-slate-300">
                      Oylik davomat dinamikasi
                    </span>
                    <span className="text-[10px] text-xedu-slate-400">6 oy</span>
                  </div>
                  <div className="flex items-end gap-2 h-20">
                    {[65, 72, 68, 78, 82, 94].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end">
                        <div
                          className="w-full rounded-t-sm bg-xedu-primary/20 dark:bg-xedu-primary/30"
                          style={{ height: `${h}%` }}
                        >
                          <div
                            className="w-full rounded-t-sm bg-xedu-primary"
                            style={{ height: `${Math.min(h * 0.7, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-3">
                    <p className="text-[10px] text-xedu-slate-400 mb-2">To'lov holati</p>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full border-2 border-xedu-primary flex items-center justify-center">
                        <span className="text-[10px] font-bold text-xedu-primary">82%</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="h-1.5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
                          <div className="h-full w-[82%] rounded-full bg-xedu-primary" />
                        </div>
                        <p className="text-[9px] text-xedu-slate-400">234/285 o'quvchi</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-3">
                    <p className="text-[10px] text-xedu-slate-400 mb-2">Bugungi darslar</p>
                    <div className="space-y-1.5">
                      {['Matematika', 'Fizika', 'Ingliz tili'].map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-xedu-primary" />
                          <span className="text-[10px] text-xedu-slate-600 dark:text-xedu-slate-400">{s}</span>
                          <span className="ml-auto text-[9px] text-xedu-slate-400">{['08:00', '10:00', '12:00'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative accent */}
            <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-xedu-primary/5 dark:bg-xedu-primary/10 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-xedu-primary/5 dark:bg-xedu-primary/10 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
