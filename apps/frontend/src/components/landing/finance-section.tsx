'use client';

import { SectionHeader } from './section-header';
import { Wallet, CreditCard, PiggyBank, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const financeModules = [
  {
    icon: CreditCard,
    title: 'To\'lovlarni yig\'ish',
    description: 'O\'quvchi to\'lovlari, qarzdorlik monitoringi va avtomatik eslatmalar.',
  },
  {
    icon: PiggyBank,
    title: 'Ish haqi',
    description: 'Xodimlar ish haqi, bonuslar, avanslar va moliyaviy hisobotlar.',
  },
  {
    icon: Receipt,
    title: 'Byudjet',
    description: 'Filiallar va bo\'limlar kesimida byudjet rejalashtirish va nazorat.',
  },
  {
    icon: Wallet,
    title: 'Kassa',
    description: 'Kunlik kassa operatsiyalari, kassir smenalari va xarajatlar nazorati.',
  },
];

const transactions = [
  { label: 'Oylik to\'lovlar', amount: '245 000 000', trend: 'up', change: '+8%' },
  { label: 'Qarzdorlik', amount: '42 000 000', trend: 'down', change: '-12%' },
  { label: 'Xarajatlar', amount: '128 000 000', trend: 'up', change: '+3%' },
  { label: 'Byudjet qoldig\'i', amount: '89 000 000', trend: 'up', change: '+15%' },
];

export function FinanceSection() {
  return (
    <section className="bg-xedu-bg dark:bg-xedu-slate-950 border-y border-xedu-slate-100 dark:border-xedu-slate-800/50">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <SectionHeader
          label="Moliya"
          title="Moliyaviy operatsiyalar"
          description="To'lovlardan ish haqigacha — barcha moliyaviy jarayonlarni bir platformadan boshqaring."
        />

        <div className="mt-14 grid lg:grid-cols-2 gap-8">
          {/* Left: Modules */}
          <div className="space-y-4">
            {financeModules.map((mod) => (
              <div
                key={mod.title}
                className="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-xedu-slate-900 border border-xedu-slate-100 dark:border-xedu-slate-800"
              >
                <div className="shrink-0 h-10 w-10 rounded-lg bg-xedu-primary-muted dark:bg-xedu-primary/10 flex items-center justify-center">
                  <mod.icon className="h-5 w-5 text-xedu-primary" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-xedu-slate-900 dark:text-white">
                    {mod.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-xedu-slate-500 dark:text-xedu-slate-400">
                    {mod.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Dashboard preview */}
          <div className="rounded-2xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[14px] font-semibold text-xedu-slate-900 dark:text-white">
                Moliyaviy ko'rsatkichlar
              </h3>
              <span className="text-[11px] text-xedu-slate-400">Sentabr 2024</span>
            </div>

            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.label}
                  className="flex items-center justify-between p-4 rounded-xl bg-xedu-bg dark:bg-xedu-slate-950 border border-xedu-slate-100 dark:border-xedu-slate-800"
                >
                  <div>
                    <p className="text-[12px] text-xedu-slate-500 dark:text-xedu-slate-400">{tx.label}</p>
                    <p className="text-lg font-bold text-xedu-slate-900 dark:text-white mt-0.5">
                      {tx.amount} so'm
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {tx.trend === 'up' ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-xedu-primary" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-xedu-primary" />
                    )}
                    <span className="text-[11px] font-medium text-xedu-primary">{tx.change}</span>
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
