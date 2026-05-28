'use client';
import * as React from "react";
import { Sparkles } from "lucide-react";

const campusHero = '/landing/campus-hero.jpg';
import { OverviewPanel } from "./OverviewPanel";
import { ProfitCard } from "./ProfitCard";
import { TenantRequestCard } from "./TenantRequestCard";
import { OccupancyCard } from "./OccupancyCard";
import { UnpaidCard } from "./UnpaidCard";
import { AvatarsCard } from "./AvatarsCard";

interface HeroSectionProps {
  goTo: (i: number) => void;
}

export function HeroSection({ goTo }: HeroSectionProps) {
  return (
    <section className="relative h-full">
      <div className="relative h-full overflow-hidden">
        <img
          src={campusHero}
          alt="Xedu boshqaruv platformasi"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, var(--hero-overlay-start) 0%, var(--hero-overlay-mid) 30%, var(--hero-overlay-end) 55%, transparent 80%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 55%, var(--hero-overlay-bottom) 100%)" }}
          aria-hidden
        />

        <div className="relative flex h-full flex-col gap-4 px-5 pt-[88px] pb-28 md:flex-row md:px-10 lg:px-14">

          {/* Left column — desktop only */}
          <div className="hidden md:flex flex-1 mt-4 flex-col gap-4 md:mt-6">
            <OverviewPanel />
            <ProfitCard />
            <button
              onClick={() => goTo(1)}
              className="self-start rounded-full bg-leaf text-primary-foreground shadow-glow font-semibold transition hover:brightness-110 px-6 py-3 text-sm"
            >
              Modullar →
            </button>
          </div>

          {/* Center column — always visible */}
          <div className="flex-1 mt-2 flex flex-col items-center justify-between gap-4 md:mt-4">
            <div className="text-center w-full">
              <span className="inline-flex items-center gap-2 rounded-full glass-tinted px-3 py-1 text-xs font-medium text-cream/90">
                <Sparkles className="h-3 w-3" /> Education Operating System
              </span>
              <div className="mt-3 rounded-3xl px-5 py-5 md:px-6" style={{ background: "var(--hero-title-panel-bg)", backdropFilter: "blur(18px) saturate(1.4)" }}>
                <h1 className="font-display text-3xl font-bold leading-[1.05] text-cream sm:text-4xl md:text-5xl">
                  Bitta platforma —
                  <br />
                  <span className="text-leaf">butun ta'lim guruhi.</span>
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-sm text-cream/80">
                  ERP, LMS, CRM, moliya va analitika — barchasi yagona operatsion tizimda.
                </p>
              </div>
              {/* Mobile-only CTA */}
              <button
                onClick={() => goTo(1)}
                className="md:hidden mt-4 rounded-full bg-leaf text-primary-foreground shadow-glow font-semibold transition hover:brightness-110 px-8 py-3 text-sm"
              >
                Modullar →
              </button>
            </div>
            <TenantRequestCard />
          </div>

          {/* Right column — desktop only */}
          <div className="hidden md:flex flex-1 mt-2 flex-col items-end gap-4 md:mt-4">
            <OccupancyCard />
            <UnpaidCard />
            <AvatarsCard />
          </div>
        </div>
      </div>
    </section>
  );
}
