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
    { label: 'Qo\'llanma', href: '#' },
    { label: 'API hujjatlari', href: '#' },
    { label: 'Xavfsizlik', href: '#' },
    { label: 'FAQ', href: '#faq' },
  ],
};

export function FooterSection() {
  return (
    <footer className="bg-xedu-slate-900 text-xedu-slate-400">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-xedu-primary">
                <span className="text-sm font-bold text-white">X</span>
              </div>
              <span className="text-base font-bold tracking-tight text-white">Xedu</span>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-xedu-slate-400 max-w-xs">
              Ta'lim guruhi uchun operatsion tizim. Akademik jarayonlar, moliya, 
              aloqa va analitikani bitta platformadan boshqaring.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a href="#" className="text-[11px] text-xedu-slate-500 hover:text-white transition-colors">
                Telegram
              </a>
              <a href="#" className="text-[11px] text-xedu-slate-500 hover:text-white transition-colors">
                LinkedIn
              </a>
              <a href="#" className="text-[11px] text-xedu-slate-500 hover:text-white transition-colors">
                YouTube
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-xedu-slate-300 mb-4">
                {title}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-xedu-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-14 pt-8 border-t border-xedu-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-xedu-slate-500">
            &copy; {new Date().getFullYear()} Xedu. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="text-[11px] text-xedu-slate-500 hover:text-white transition-colors">
              Maxfiylik siyosati
            </a>
            <a href="#" className="text-[11px] text-xedu-slate-500 hover:text-white transition-colors">
              Foydalanish shartlari
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
