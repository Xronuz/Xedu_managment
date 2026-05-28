'use client';
import { useState, useRef } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { Navbar } from "./Navbar";
import { RolesSection } from "./RolesSection";
import { ModulesSection } from "./ModulesSection";
import { HeroSection } from "./HeroSection";
import { AnalyticsSection } from "./AnalyticsSection";
import { BranchesSection } from "./BranchesSection";
import { DemoCTA } from "./DemoCTA";

export function LandingPage() {
  const [active, setActive] = useState(2);
  const [prev, setPrev]     = useState<number | null>(null);
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (tab: number) => {
    if (tab === active) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPrev(active);
    setActive(tab);
    timerRef.current = setTimeout(() => setPrev(null), 480);
  };

  const dir = prev !== null ? (active > prev ? 1 : -1) : 0;

  return (
    <div className="landing-root relative h-screen overflow-hidden bg-[#F2F7F4] text-[#252E28]" style={{ colorScheme: 'light', '--background': '140 6% 97.3%', '--foreground': '150 15% 15%', '--muted-foreground': '150 8% 45%', '--card': '0 0% 100%', '--border': '150 10% 88%' } as React.CSSProperties}>
      <style>{`
        @keyframes xi {
          from { transform: translateX(calc(var(--d,0) * 32px)) scale(.96); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
        @keyframes xo {
          from { transform: none; opacity: 1; }
          to   { transform: translateX(calc(var(--d,0) * -32px)) scale(.96); opacity: 0; }
        }
        .xi { animation: xi .46s cubic-bezier(.22,1,.36,1) both; }
        .xo { animation: xo .46s cubic-bezier(.22,1,.36,1) both; }
        .tab-bar-bg { backdrop-filter: blur(20px) saturate(1.6); }
      `}</style>

      {/* Single shared navbar — always above all panels */}
      <div className="absolute top-0 inset-x-0 z-10 px-5 pt-3 md:px-10 lg:px-14">
        <Navbar active={active} goTo={goTo} />
      </div>

      <Panel id={0} active={active} prev={prev} dir={dir}><RolesSection /></Panel>
      <Panel id={1} active={active} prev={prev} dir={dir}><ModulesSection /></Panel>
      <Panel id={2} active={active} prev={prev} dir={dir}><HeroSection goTo={goTo} /></Panel>
      <Panel id={3} active={active} prev={prev} dir={dir}>
        <section className="relative min-h-full px-5 pt-[68px] pb-28 md:px-10 lg:px-14 bg-background">
          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsSection />
            <BranchesSection />
          </div>
        </section>
      </Panel>
      <Panel id={4} active={active} prev={prev} dir={dir}><DemoCTA /></Panel>

      <BottomTabBar active={active} goTo={goTo} />
    </div>
  );
}

function Panel({
  id, active, prev, dir, children,
}: {
  id: number; active: number; prev: number | null; dir: number;
  children: React.ReactNode;
}) {
  const show = active === id;
  const exit = prev   === id;
  if (!show && !exit) return null;

  const animClass = dir !== 0 ? (show ? "xi" : "xo") : "";

  return (
    <div
      className={`absolute inset-0 overflow-y-auto overflow-x-hidden ${animClass}`}
      style={{ zIndex: show ? 2 : 1, "--d": dir } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
