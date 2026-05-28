import * as React from "react";

export function OccupancyCard() {
  return (
    <div className="card-glass-light w-full max-w-sm">
      <div className="flex items-start justify-between">
        <div className="font-display text-lg font-bold leading-tight">
          Filial<br />yuklamasi
        </div>
        <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs">Fl. 1 ▾</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf" /> 4 ta bo'sh sinf
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> 2 ta to'liq
          </div>
        </div>
        <div className="ml-auto grid h-14 w-18 grid-cols-3 gap-1">
          {["bg-leaf/30", "bg-leaf/30", "bg-destructive/40", "bg-leaf/30", "bg-leaf/60", "bg-leaf/30"].map((c, i) => (
            <div key={i} className={`rounded-sm ${c}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
