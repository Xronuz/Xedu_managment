import * as React from "react";
import { Bus, Utensils, ShieldCheck, CheckCircle2 } from "lucide-react";
import { SectionEyebrow } from "./StatBadge";
import { ExtraServiceCell } from "./BranchCell";

export function AnalyticsSection() {
  const extra = [
    { icon: Bus,         t: "Transport",  d: "Marshrutlar va haydovchilar nazorati." },
    { icon: Utensils,    t: "Oshxona",    d: "Menyu, statistika va xarajatlar."      },
    { icon: ShieldCheck, t: "Xavfsizlik", d: "Audit jurnali va ruxsatlar ierarxiyasi." },
  ];

  return (
    <div className="group relative overflow-hidden card-glass-module p-6">
      <SectionEyebrow label="Ko'p filial" />
      <h2 className="mt-2 font-display text-3xl font-bold leading-tight md:text-4xl">
        Har bir filial <span className="text-leaf-deep">nazoratingiz ostida.</span>
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Yangi filiallarni qo'shish murakkablik emas — Xedu infratuzilmangizni o'sishga moslashtiradi.
      </p>

      <ul className="mt-4 space-y-2">
        {[
          "Har bir filial uchun alohida byudjet va hisobot",
          "Filiallar o'rtasida o'quvchi va xodimlar harakati",
          "Markaziy ota-onalar bazasi va aloqa markazi",
          "Filial darajasida ruxsatlar va rollar boshqaruvi",
        ].map((t) => (
          <li key={t} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {extra.map((e) => (
          <ExtraServiceCell
            key={e.t}
            title={e.t}
            description={e.d}
            icon={e.icon}
          />
        ))}
      </div>
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-leaf/15 blur-3xl" />
    </div>
  );
}
