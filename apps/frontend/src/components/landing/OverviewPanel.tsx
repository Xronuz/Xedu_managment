import * as React from "react";
import { Plus, ClipboardList } from "lucide-react";
import { StatRow } from "./StatBadge";

export function OverviewPanel() {
  return (
    <div className="card-glass-dark">
      <div className="flex items-start justify-between">
        <h3 className="font-display text-xl font-bold leading-tight text-cream">
          Boshqaruv<br />paneli
        </h3>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-cream/15 text-cream">
          <ClipboardList className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-leaf text-lg">👋</div>
        <div className="text-sm text-cream">
          Xush kelibsiz,<br />
          <span className="font-semibold">Direktor!</span>
        </div>
        <button className="ml-auto h-8 w-8 rounded-full bg-cream/15 text-cream flex items-center justify-center transition hover:bg-leaf hover:text-primary-foreground">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <p className="font-medium text-cream/90">Operatsion stats</p>
        <StatRow dot="bg-leaf"      label="O'quvchilar" value="1,248" />
        <StatRow dot="bg-amber-400" label="Filiallar"   value="8 ta"  />
        <StatRow dot="bg-cream/70"  label="Davomat"     value="94.2%" />
      </div>
    </div>
  );
}
