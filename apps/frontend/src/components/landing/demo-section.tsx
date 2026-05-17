'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Mail, Phone, Building2 } from 'lucide-react';
import { useState } from 'react';

export function DemoSection() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="demo" className="relative surface-atmospheric overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-24 sm:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-xedu-primary mb-5">
              Demo
            </span>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-[-0.025em] text-xedu-slate-950 leading-[1.15]">
              Platformani yaqindan ko'ring
            </h2>
            <p className="mt-6 text-base text-xedu-slate-500 leading-[1.7]">
              Xedu jamoasi sizning tashkilotingiz uchun maxsus demo tayyorlaydi. 
              Platformaning barcha imkoniyatlarini o'z ehtiyojlaringiz asosida ko'ring.
            </p>

            <div className="mt-12 space-y-6">
              {[
                { icon: Building2, title: 'Institutsional yondashuv', desc: 'Sizning tashkilotingiz hajmi va tuzilmasiga moslashtirilgan taqdimot' },
                { icon: Phone, title: 'Shaxsiy maslahatchi', desc: 'Har bir mijozga alohida mas‘ul shaxs tayinlanadi' },
                { icon: Mail, title: '24 soat ichida javob', desc: 'So‘rovlarni tez va samarali qayta ishlash' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-xedu-primary/[0.06] flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-xedu-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-xedu-slate-900 tracking-tight">{item.title}</p>
                    <p className="mt-1 text-[12px] text-xedu-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-premium-lg p-7 sm:p-9 border border-xedu-slate-100/50">
            {submitted ? (
              <div className="text-center py-14">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-xedu-primary/[0.06] mb-5">
                  <Mail className="h-6 w-6 text-xedu-primary" />
                </div>
                <h3 className="text-lg font-bold text-xedu-slate-900 tracking-tight">So'rov yuborildi</h3>
                <p className="mt-2 text-[13px] text-xedu-slate-500 leading-relaxed">
                  Xedu jamoasi tez orada siz bilan bog'lanadi.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-[16px] font-bold text-xedu-slate-900 tracking-tight mb-1">
                  Demo so'rash
                </h3>
                <p className="text-[12px] text-xedu-slate-500 mb-7">
                  Quyidagi formani to'ldiring, biz siz bilan bog'lanamiz.
                </p>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(true);
                  }}
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-xedu-slate-600 mb-1.5 block">Ism</label>
                      <Input placeholder="Ismingiz" className="h-11 text-[13px] bg-xedu-slate-50/50 border-xedu-slate-200/60" required />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-xedu-slate-600 mb-1.5 block">Familiya</label>
                      <Input placeholder="Familiyangiz" className="h-11 text-[13px] bg-xedu-slate-50/50 border-xedu-slate-200/60" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-xedu-slate-600 mb-1.5 block">Ta'lim muassasasi</label>
                    <Input placeholder="Maktab yoki o'quv markaz nomi" className="h-11 text-[13px] bg-xedu-slate-50/50 border-xedu-slate-200/60" required />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-xedu-slate-600 mb-1.5 block">Email</label>
                    <Input type="email" placeholder="email@example.com" className="h-11 text-[13px] bg-xedu-slate-50/50 border-xedu-slate-200/60" required />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-xedu-slate-600 mb-1.5 block">Telefon</label>
                    <Input placeholder="+998 90 123 45 67" className="h-11 text-[13px] bg-xedu-slate-50/50 border-xedu-slate-200/60" required />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 text-[13px] font-semibold bg-xedu-primary hover:bg-xedu-primary-hover shadow-premium-sm hover:shadow-premium-md transition-all duration-200 mt-2"
                  >
                    So'rov yuborish
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
