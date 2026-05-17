'use client';

import { SectionHeader } from './section-header';
import { Wallet, CreditCard, PiggyBank, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const financeModules = [
  { icon: CreditCard, title: 'To‘lovlarni yig‘ish', description: 'O‘quvchi to‘lovlari, qarzdorlik monitoringi va avtomatik eslatmalar.' },
  { icon: PiggyBank, title: 'Ish haqi', description: 'Xodimlar ish haqi, bonuslar, avanslar va moliyaviy hisobotlar.' },
  { icon: Receipt, title: 'Byudjet', description: 'Filiallar va bo‘limlar kesimida byudjet rejalashtirish va nazorat.' },
  { icon: Wallet, title: 'Kassa', description: 'Kunlik kassa operatsiyalari, kassir smenalari va xarajatlar nazorati.' },
];

const transactions = [
  { label: 'Oylik to‘lovlar', amount: '245 000 000', trend: 'up', change: '+8%' },
  { label: 'Qarzdorlik', amount: '42 000 000', trend: 'down', change: '-12%' },
  { label: 'Xarajatlar', amount: '128 000 000', trend: 'up', change: '+3%' },
  { label: 'Byudjet qoldig‘i', amount: '89 000 000', trend: 'up', change: '+15%' },
];

export function FinanceSection() {
  return (
    <section className="relative surface-atmospheric overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32">
        <SectionHeader
          label="Moliya"
          title="Moliyaviy operatsiyalar"
          description="To'lovlardan ish haqigacha — barcha moliyaviy jarayonlarni bir platformadan boshqaring."
        />

        <div className="mt-16 grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {financeModules.map((mod) => (
              <div
                key={mod.title}
                className="flex items-start gap-4 p-6 rounded-2xl bg-white shadow-premium-sm hover:shadow-premium-md transition-all duration-300"
              >
                <div className="shrink-0 h-10 w-10 rounded-xl bg-xedu-primary/[0.06] flex items-center justify-center">
                  <mod.icon className="h-5 w-5 text-xedu-primary" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-xedu-slate-900 tracking-tight">{mod.title}</h3>
                  <p className="mt-1 text-[12px] leading-[1.7] text-xedu-slate-500">{mod.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white shadow-premium-md p-7 border border-xedu-slate-100/50">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h3 className="text-[14px] font-semibold text-xedu-slate-900">Moliyaviy ko'rsatkichlar</h3>
                <p className="text-[11px] text-xedu-slate-400 mt-0.5">Sentabr 2024</p>
              </div>
              <span className="text-[10px] text-xedu-slate-400 px-2.5 py-1 rounded-md bg-xedu-slate-50 border border-xedu-slate-100/60">Oylik</span>
            </div>

            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.label}
                  className="flex items-center justify-between p-4 rounded-xl bg-xedu-slate-50/70 border border-xedu-slate-100/40"
                >
                  <div>
                    <p className="text-[11px] text-xedu-slate-400 font-medium">{tx.label}</p>
                    <p className="text-lg font-bold text-xedu-slate-900 tracking-tight mt-1">{tx.amount} <span className="text-[11px] font-medium text-xedu-slate-400">so'm</span></p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-xedu-slate-100/60">
                    {tx.trend === 'up' ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-xedu-primary" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-xedu-primary" />
                    )}
                    <span className="text-[11px] font-semibold text-xedu-primary">{tx.change}</span>
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
