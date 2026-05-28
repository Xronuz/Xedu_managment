import * as React from "react";
import { Building2 } from "lucide-react";
import { BranchCell } from "./BranchCell";

function StatLight({ val, label }: { val: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="font-display text-2xl font-bold">{val}</div>
      <div className="text-label-sm uppercase tracking-wider text-foreground/55">{label}</div>
    </div>
  );
}

export function BranchesSection() {
  const branches = [
    { n: "Chilonzor",  s: "320 o'quvchi", t: "28 xodim" },
    { n: "Yunusobod",  s: "410 o'quvchi", t: "35 xodim" },
    { n: "Sergeli",    s: "280 o'quvchi", t: "22 xodim" },
    { n: "Yakkasaroy", s: "238 o'quvchi", t: "19 xodim" },
  ];

  return (
    <div className="group relative overflow-hidden card-glass-module">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-leaf">Markaziy ofis</div>
          <div className="font-display text-lg font-bold">Barcha filiallar</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-leaf text-primary-foreground">
          <Building2 className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {branches.map((b) => (
          <BranchCell
            key={b.n}
            name={b.n}
            students={b.s}
            staff={b.t}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-around border-t border-foreground/10 pt-4">
        <StatLight val="8"     label="Filial"    />
        <div className="h-8 w-px bg-foreground/10" />
        <StatLight val="1,248" label="O'quvchi"  />
        <div className="h-8 w-px bg-foreground/10" />
        <StatLight val="104"   label="Xodim"     />
      </div>
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-leaf/15 blur-3xl" />
    </div>
  );
}
