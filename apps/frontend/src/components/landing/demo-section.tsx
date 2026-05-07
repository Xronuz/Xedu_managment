'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Mail, Phone, Building2 } from 'lucide-react';
import { useState } from 'react';

export function DemoSection() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="demo" className="bg-xedu-bg dark:bg-xedu-slate-950 border-y border-xedu-slate-100 dark:border-xedu-slate-800/50">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-xedu-primary mb-4">
              Demo
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-xedu-slate-900 dark:text-white leading-tight">
              Platformani yaqindan ko'ring
            </h2>
            <p className="mt-5 text-base text-xedu-slate-500 dark:text-xedu-slate-400 leading-relaxed">
              Xedu jamoasi sizning tashkilotingiz uchun maxsus demo tayyorlaydi. 
              Platformaning barcha imkoniyatlarini o'z ehtiyojlaringiz asosida ko'ring.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-xedu-primary-muted dark:bg-xedu-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-xedu-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-xedu-slate-900 dark:text-white">Institutsional yondashuv</p>
                  <p className="text-[12px] text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">
                    Sizning tashkilotingiz hajmi va tuzilmasiga moslashtirilgan taqdimot
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-xedu-primary-muted dark:bg-xedu-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-xedu-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-xedu-slate-900 dark:text-white">Shaxsiy maslahatchi</p>
                  <p className="text-[12px] text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">
                    Har bir mijozga alohida mas'ul shaxs tayinlanadi
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-xedu-primary-muted dark:bg-xedu-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-xedu-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-xedu-slate-900 dark:text-white">24 soat ichida javob</p>
                  <p className="text-[12px] text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">
                    So'rovlarni tez va samarali qayta ishlash
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="rounded-2xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-xedu-primary-muted dark:bg-xedu-primary/10 mb-4">
                  <Mail className="h-5 w-5 text-xedu-primary" />
                </div>
                <h3 className="text-lg font-bold text-xedu-slate-900 dark:text-white">So'rov yuborildi</h3>
                <p className="mt-2 text-[13px] text-xedu-slate-500 dark:text-xedu-slate-400">
                  Xedu jamoasi tez orada siz bilan bog'lanadi.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-[15px] font-bold text-xedu-slate-900 dark:text-white mb-1">
                  Demo so'rash
                </h3>
                <p className="text-[12px] text-xedu-slate-500 dark:text-xedu-slate-400 mb-6">
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
                      <label className="text-[11px] font-medium text-xedu-slate-600 dark:text-xedu-slate-400 mb-1.5 block">
                        Ism
                      </label>
                      <Input placeholder="Ismingiz" className="h-10 text-[13px]" required />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-xedu-slate-600 dark:text-xedu-slate-400 mb-1.5 block">
                        Familiya
                      </label>
                      <Input placeholder="Familiyangiz" className="h-10 text-[13px]" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-xedu-slate-600 dark:text-xedu-slate-400 mb-1.5 block">
                      Ta'lim muassasasi
                    </label>
                    <Input placeholder="Maktab yoki o'quv markaz nomi" className="h-10 text-[13px]" required />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-xedu-slate-600 dark:text-xedu-slate-400 mb-1.5 block">
                      Email
                    </label>
                    <Input type="email" placeholder="email@example.com" className="h-10 text-[13px]" required />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-xedu-slate-600 dark:text-xedu-slate-400 mb-1.5 block">
                      Telefon
                    </label>
                    <Input placeholder="+998 90 123 45 67" className="h-10 text-[13px]" required />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 text-[13px] font-semibold bg-xedu-primary hover:bg-xedu-primary-hover mt-2"
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
