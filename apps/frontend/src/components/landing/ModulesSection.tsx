import * as React from "react";
import { Building2, BookOpen, Users, Wallet, LineChart, ShieldCheck } from "lucide-react";
import { SectionEyebrow } from "./StatBadge";
import { ModuleItem } from "./ModuleItem";

export function ModulesSection() {
  const modules = [
    { n: "01", t: "ERP",        d: "Kadrlar, ta'minot va operatsion jarayonlar.", icon: Building2  },
    { n: "02", t: "LMS",        d: "Dars jadvali, baholash, akademik kuzatuv.",   icon: BookOpen   },
    { n: "03", t: "CRM",        d: "Abituriyent, leads va ota-onalar aloqasi.",    icon: Users      },
    { n: "04", t: "Finance",    d: "To'lov, byudjet, ish haqi va hisobot.",        icon: Wallet     },
    { n: "05", t: "Analytics",  d: "KPI, ko'rsatkichlar va strategik qarorlar.",   icon: LineChart  },
    { n: "06", t: "Governance", d: "Ruxsatlar, audit va institutsional nazorat.",  icon: ShieldCheck },
  ];

  return (
    <section className="relative min-h-full px-5 pt-[68px] pb-28 md:px-10 lg:px-14 bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 15% 30%, oklch(0.72 0.21 145 / 0.15), transparent 70%), radial-gradient(50% 50% at 85% 70%, oklch(0.32 0.08 155 / 0.2), transparent 70%)",
        }}
        aria-hidden
      />

      <SectionEyebrow label="Modullar" />
      <h2 className="mt-2 font-display text-3xl font-bold leading-tight md:text-4xl">
        Bitta platforma. <span className="text-leaf-deep">Har tomonlama boshqaruv.</span>
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
        Xedu alohida tizimlarni birlashtiradi — yagona ma'lumotlar bazasi va ruxsatlar tizimida.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <ModuleItem
            key={m.n}
            num={m.n}
            title={m.t}
            description={m.d}
            Icon={m.icon}
          />
        ))}
      </div>
    </section>
  );
}
