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
        'fixed top-0 left-0 right-0 z-50 transition-all duration-150',
        scrolled
          ? 'bg-white/90 dark:bg-xedu-slate-900/90 backdrop-blur-md border-b border-xedu-slate-100 dark:border-xedu-slate-800'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-xedu-primary">
              <span className="text-sm font-bold text-white">X</span>
            </div>
            <span className="text-base font-bold tracking-tight text-xedu-slate-900 dark:text-white">
              Xedu
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-[13px] font-medium text-xedu-slate-600 dark:text-xedu-slate-400 hover:text-xedu-slate-900 dark:hover:text-white transition-colors rounded-md hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[13px] font-medium h-9">
                Tizimga kirish
              </Button>
            </Link>
            <a href="#demo">
              <Button size="sm" className="text-[13px] font-semibold h-9 bg-xedu-primary hover:bg-xedu-primary-hover">
                Demo so'rash
              </Button>
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md text-xedu-slate-600 dark:text-xedu-slate-400 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menyu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-xedu-slate-900 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
          <div className="px-5 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-[13px] font-medium text-xedu-slate-600 dark:text-xedu-slate-400 hover:text-xedu-slate-900 dark:hover:text-white rounded-md hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full text-[13px] h-10">
                  Tizimga kirish
                </Button>
              </Link>
              <a href="#demo" onClick={() => setMobileOpen(false)}>
                <Button className="w-full text-[13px] h-10 bg-xedu-primary hover:bg-xedu-primary-hover">
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
