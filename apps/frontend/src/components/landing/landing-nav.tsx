'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Platforma', href: '#platforma' },
  { label: 'Modullar', href: '#modullar' },
  { label: 'Rollar', href: '#rollar' },
  { label: 'Filial', href: '#filial' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
        scrolled
          ? 'bg-white/85 backdrop-blur-xl border-b border-xedu-slate-100/80 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex h-[3.75rem] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-xedu-primary shadow-premium-sm transition-shadow duration-200 group-hover:shadow-premium-md">
              <span className="text-sm font-bold text-white">X</span>
            </div>
            <span className="text-base font-bold tracking-tight text-xedu-slate-900">
              Xedu
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-[13px] font-medium text-xedu-slate-500 hover:text-xedu-slate-900 transition-colors duration-150 rounded-lg hover:bg-xedu-slate-50/80"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[13px] font-medium h-9 text-xedu-slate-600 hover:text-xedu-slate-900 hover:bg-xedu-slate-50/80">
                Tizimga kirish
              </Button>
            </Link>
            <a href="#demo">
              <Button size="sm" className="text-[13px] font-semibold h-9 bg-xedu-primary hover:bg-xedu-primary-hover shadow-premium-sm hover:shadow-premium-md transition-all duration-200">
                Demo so'rash
              </Button>
            </a>
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-xedu-slate-500 hover:text-xedu-slate-900 hover:bg-xedu-slate-50/80 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menyu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-xedu-slate-100/80 shadow-lg">
          <div className="px-5 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-[13px] font-medium text-xedu-slate-600 hover:text-xedu-slate-900 rounded-lg hover:bg-xedu-slate-50/80 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full text-[13px] h-10 border-xedu-slate-200/80">
                  Tizimga kirish
                </Button>
              </Link>
              <a href="#demo" onClick={() => setMobileOpen(false)}>
                <Button className="w-full text-[13px] h-10 bg-xedu-primary hover:bg-xedu-primary-hover shadow-premium-sm">
                  Demo so'rash
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
