'use client';

import { SectionHeader } from './section-header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  { question: 'Xedu qanday ta\'lim tashkilotlari uchun mo\'ljallangan?', answer: 'Xedu hususiy maktablar, o\'quv markazlari, ta\'lim guruhlari va ko\'p filialli ta\'lim tashkilotlari uchun ishlab chiqilgan. Platforma katta va o\'rta hajmdagi tashkilotlarning operatsion ehtiyojlarini qondirishga qaratilgan.' },
  { question: 'Bir necha filialni qanday boshqarsa bo\'ladi?', answer: 'Xedu ko\'p filialli arxitekturaga asoslangan. Har bir filial alohida ishlaydi, lekin markaziy ofis barcha filiallarning ma\'lumotlarini, moliyaviy holatini va operatsion ko\'rsatkichlarini yagona oynadan ko\'rishi mumkin. Filiallar o\'rtasida xodimlar va o\'quvchilarni ko\'chirish oson amalga oshiriladi.' },
  { question: 'Mavjud tizimdan ma\'lumotlarni ko\'chirish mumkinmi?', answer: 'Ha, Xedu Excel va CSV formatlarida ma\'lumotlarni import qilish imkoniyatiga ega. Shuningdek, bizning jamoa murakkabroq ma\'lumotlar migratsiyasi uchun professional xizmat ko\'rsatadi.' },
  { question: 'Xavfsizlik qanday ta\'minlanadi?', answer: 'Xedu ma\'lumotlar xavfsizligiga ustuvor ahamiyat beradi. Platforma JWT-based autentifikatsiya, rol-asosida ruxsatlar tizimi (RBAC), audit jurnali va shifrlangan ulanishlarni qo\'llab-quvvatlaydi. Barcha ma\'lumotlar xavfsiz serverlarda saqlanadi.' },
  { question: 'Onboarding jarayoni qanday?', answer: 'O\'rtacha onboarding muddati 2-4 hafta. Bizning jamoa sizning tashkilotingiz tuzilmasini o\'rganadi, ma\'lumotlarni import qiladi, xodimlarni o\'qitadi va platformani to\'liq ishga tushirishda yordam beradi.' },
  { question: 'Qo\'llab-quvvatlash xizmati mavjudmi?', answer: 'Ha, biz 24/7 texnik qo\'llab-quvvatlash, telefon yordami va onlayn chat xizmatlarini taqdim etamiz. Shuningdek, har bir mijozga alohida mas\'ul menejer tayinlanadi.' },
  { question: 'Mobil ilova bormi?', answer: 'Xedu platformasi responsive dizaynga ega va barcha qurilmalarda ishlashi mumkin. Hozirda web-ilova orqali to\'liq funksionallik taqdim etiladi. Mobil ilova rejalashtirish jarayonida.' },
  { question: 'Narxlar siyosati qanday?', answer: 'Xedu o\'quvchilar soni va filiallar hajmiga asoslangan fleksibel narxlar siyosatiga ega. Aniq narxni bilish uchun demo so\'rash formasini to\'ldiring, biz sizga mos taklif tayyorlaymiz.' },
];

export function FaqSection() {
  return (
    <section id="faq" className="relative bg-white overflow-hidden">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-24 sm:py-32">
        <SectionHeader
          label="FAQ"
          title="Ko'p so'raladigan savollar"
        />

        <div className="mt-16">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-2xl bg-white shadow-premium-sm border-0 px-6 data-[state=open]:shadow-premium-md transition-all duration-300"
              >
                <AccordionTrigger className="text-left text-[14px] font-semibold text-xedu-slate-800 hover:no-underline py-5 tracking-tight">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[13px] leading-[1.75] text-xedu-slate-500 pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
