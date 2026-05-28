import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { IndicatorLine } from "./ChartBar";

export function UnpaidCard() {
  const rows = [
    { range: "0-30 kun",  sum: "12,238" },
    { range: "31-60 kun", sum: "11,363" },
    { range: "61-90 kun", sum: "5,214"  },
    { range: "91+ kun",   sum: "1,834"  },
  ];
  return (
    <div className="card-glass-dark w-full max-w-sm">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-semibold text-cream">Qarzdorlik</h4>
        <span className="rounded-full bg-cream/10 px-3 py-1 text-xs text-cream/80">May ▾</span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.range}>
            <div className="flex items-center justify-between text-xs text-cream/80">
              <span>{r.range}</span>
              <span className="font-semibold text-cream">${r.sum}</span>
            </div>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: 22 }).map((_, i) => (
                <IndicatorLine key={i} isEven={i % 2 === 0} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-cream/10 pt-3">
        <div>
          <div className="text-label-xs uppercase tracking-wider text-cream/55">Jami</div>
          <div className="font-display text-xl font-bold text-cream">$30,650.12</div>
        </div>
        <button className="h-9 w-9 rounded-full bg-cream text-foreground flex items-center justify-center transition hover:bg-leaf hover:text-primary-foreground">
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
