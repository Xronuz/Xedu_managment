import * as React from "react";
import { Metric } from "./StatBadge";
import { ChartBar } from "./ChartBar";

export function ProfitCard() {
  return (
    <div className="card-glass-dark">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-semibold text-cream">Moliyaviy oqim</h4>
        <span className="rounded-full bg-cream/10 px-3 py-1 text-xs text-cream/80">May ▾</span>
      </div>
      <div className="mt-4 flex h-10 items-end gap-[3px]">
        {Array.from({ length: 28 }).map((_, i) => {
          const h = 30 + Math.sin(i * 0.7) * 25 + Math.random() * 15;
          const isRed = i > 16 && i % 3 === 0;
          return (
            <ChartBar key={i} heightPercent={h} isNegative={isRed} />
          );
        })}
        <span className="mx-1 h-full w-px bg-cream/30" />
        {Array.from({ length: 12 }).map((_, i) => (
          <ChartBar key={i} heightPercent={20 + Math.random() * 30} isNegative />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-cream">
        <Metric label="Aylanma" value="₿ 1.2M" />
        <Metric label="Daromad" value="₿ 980K" />
        <Metric label="Xarajat" value="₿ 220K" />
      </div>
    </div>
  );
}
