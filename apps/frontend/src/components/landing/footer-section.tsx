'use client';

import Link from 'next/link';

const footerLinks = {
  Platforma: [
    { label: 'Modullar', href: '#modullar' },
    { label: 'Rollar', href: '#rollar' },
    { label: 'Filial boshqaruvi', href: '#filial' },
    { label: 'Analitika', href: '#platforma' },
  ],
  Kompaniya: [
    { label: 'Biz haqimizda', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Karyera', href: '#' },
    { label: 'Aloqa', href: '#demo' },
  ],
  Yordam: [
    { label: 'Qo‘llanma', href: '#' },
    { label: 'API hujjatlari', href: '#' },
    { label: 'Xavfsizlik', href: '#' },
    { label: 'FAQ', href: '#faq' },
  ],
};

export function FooterSection() {
  return (
    <footer className="relative bg-xedu-slate-950 text-xedu-slate-400 overflow-hidden">
      {/* Subtle top edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-800 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-xedu-primary shadow-premium-sm">
                <span className="text-sm font-bold text-white">X</span>
              </div>
              <span className="text-base font-bold tracking-tight text-white">Xedu</span>
            </div>
            <p className="mt-4 text-[13px] leading-[1.75] text-xedu-slate-500 max-w-xs">
              Ta'lim guruhi uchun operatsion tizim. Akademik jarayonlar, moliya, 
              aloqa va analitikani bitta platformadan boshqaring.
            </p>
            <div className="mt-6 flex items-center gap-5">
              <a href="#" className="text-[11px] text-xedu-slate-600 hover:text-white transition-colors duration-200">Telegram</a>
              <a href="#" className="text-[11px] text-xedu-slate-600 hover:text-white transition-colors duration-200">LinkedIn</a>
              <a href="#" className="text-[11px] text-xedu-slate-600 hover:text-white transition-colors duration-200">YouTube</a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-xedu-slate-300 mb-5">
                {title}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-xedu-slate-500 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-xedu-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-xedu-slate-600">
            &copy; {new Date().getFullYear()} Xedu. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[11px] text-xedu-slate-600 hover:text-white transition-colors duration-200">Maxfiylik siyosati</a>
            <a href="#" className="text-[11px] text-xedu-slate-600 hover:text-white transition-colors duration-200">Foydalanish shartlari</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
