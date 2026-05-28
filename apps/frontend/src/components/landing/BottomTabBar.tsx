'use client';
import * as React from "react";
import { Users, CalendarClock, BookOpen, LineChart, Settings } from "lucide-react";

const xeduIcon = '/landing/xedu-icon.png';

export const TABS = [
  { Icon: Users,         label: "Rollar"    },
  { Icon: CalendarClock, label: "Modullar"  },
  { Icon: BookOpen,      label: "Platforma" },
  { Icon: LineChart,     label: "Analitika" },
  { Icon: Settings,      label: "Demo"      },
];

interface BottomTabBarProps {
  active: number;
  goTo: (tab: number) => void;
}

export function BottomTabBar({ active, goTo }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none pb-safe-bottom">
      <div className="tab-bar-bg flex items-center gap-3 rounded-full glass-tinted px-3 py-2 shadow-float pointer-events-auto overflow-visible">
        {TABS.map(({ Icon, label }, i) => {
          const isActive = active === i;
          const isLogo = i === 2; // Platforma tab — logo ishlatiladi
          return (
            <button
              key={i}
              onClick={() => goTo(i)}
              title={label}
              aria-label={label}
              className={[
                "relative flex items-center justify-center rounded-full transition-all duration-300 ease-out overflow-visible",
                isActive && isLogo
                  ? "scale-110 w-16 h-16"
                  : isActive
                  ? "bg-leaf shadow-glow scale-105 w-16 h-16"
                  : "text-cream/70 hover:text-cream hover:bg-leaf-deep/40 w-12 h-12",
              ].join(" ")}
              style={isActive && isLogo ? {
                background: [
                  "radial-gradient(ellipse at 38% 28%, var(--logo-active-glare-top) 0%, transparent 55%)",
                  "radial-gradient(ellipse at 70% 75%, var(--logo-active-glow-bottom) 0%, transparent 50%)",
                  "linear-gradient(145deg, var(--logo-active-grad-start) 0%, var(--logo-active-grad-mid) 55%, var(--logo-active-grad-end) 100%)",
                ].join(", "),
                boxShadow: [
                  "var(--logo-active-inset-shadow-top)",
                  "var(--logo-active-inset-shadow-bottom)",
                  "var(--logo-active-inset-shadow-left)",
                  "var(--logo-active-inset-shadow-right)",
                  "var(--logo-active-drop-shadow)",
                  "var(--logo-active-base-shadow)",
                ].join(", "),
                border: "var(--logo-active-border)",
              } : undefined}
            >
              {isLogo ? (
                <img
                  src={xeduIcon}
                  alt="Xedu"
                  style={{
                    position: "absolute",
                    width:    isActive ? 56 : 88,
                    height:   isActive ? 56 : 88,
                    maxWidth: "none",
                    minWidth: isActive ? 56 : 88,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    objectFit: "contain",
                    filter: isActive ? "brightness(0) invert(1)" : "brightness(0) invert(1) opacity(0.7)",
                  }}
                />
              ) : (
                <Icon className={isActive ? "h-5 w-5 text-primary-foreground" : "h-4 w-4"} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
