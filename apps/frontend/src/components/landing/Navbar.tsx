'use client';
import * as React from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { TABS } from "./BottomTabBar";

const xeduTransparent = '/landing/xedu-emerald-transparent.png';

interface NavbarProps {
  active: number;
  goTo: (i: number) => void;
}

export function Navbar({ active, goTo }: NavbarProps) {
  const isHero = active === 2;

  return (
    <header className="flex items-center justify-between">
      <div
        className={`flex items-center rounded-full px-4 py-1 overflow-visible transition-all duration-300 ${
          isHero ? "glass-tinted" : "bg-foreground/8 border border-foreground/10"
        }`}
      >
        <img
          src={xeduTransparent}
          alt="Xedu"
          className="w-auto max-w-none object-contain transition-all duration-300 h-8"
        />
      </div>

      <nav
        className={`hidden items-center gap-1 rounded-full p-1 md:flex transition-all duration-300 ${
          isHero ? "glass-tinted" : "bg-foreground/8 border border-foreground/10"
        }`}
      >
        {TABS.map(({ label }, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
              i === active
                ? "bg-leaf text-primary-foreground shadow-glow"
                : isHero
                  ? "text-cream/85 hover:text-cream"
                  : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="flex items-center">
        <Link
          href="/login"
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            isHero
              ? "glass-tinted text-cream hover:bg-leaf-deep hover:shadow-glow"
              : "bg-foreground/8 border border-foreground/10 text-foreground/80 hover:bg-leaf hover:text-primary-foreground hover:shadow-glow hover:border-transparent"
          }`}
        >
          <LogIn className="h-4 w-4" />
          Kirish
        </Link>
      </div>
    </header>
  );
}
