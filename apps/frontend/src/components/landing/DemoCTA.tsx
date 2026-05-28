'use client';
import * as React from "react";
import { CheckCircle2 } from "lucide-react";

const campusHero = '/landing/campus-hero.jpg';

function Field({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-label-sm uppercase tracking-wider text-cream/55">{label}</span>
      <input
        type={type}
        className="mt-1 w-full rounded-xl border border-cream/15 bg-cream/[0.04] px-3 py-2.5 text-sm text-cream outline-none transition focus:border-leaf"
      />
    </label>
  );
}

export function DemoCTA() {
  return (
    <section className="relative h-full overflow-hidden px-5 pt-[68px] pb-28 md:px-10 lg:px-14 bg-background">
      <div className="relative overflow-hidden rounded-3xl bg-leaf-gradient p-8 md:p-12">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
          <img src={campusHero} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, var(--demo-cta-overlay-start) 0%, var(--demo-cta-overlay-end) 60%, transparent 100%)",
          }}
          aria-hidden
        />

        <div className="relative grid gap-8 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-cream/15 px-3 py-1 text-xs font-medium text-cream backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cream" /> Demo
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cream md:text-4xl">
              Platformani yaqindan ko'ring.
            </h2>
            <p className="mt-3 max-w-md text-sm text-cream/85">
              Jamoamiz sizning tashkilotingiz uchun maxsus demo tayyorlaydi.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-cream/90">
              {[
                "Tashkilotingiz hajmiga moslashtirilgan taqdimot",
                "Har bir mijozga shaxsiy mas'ul shaxs",
                "24 soat ichida javob",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cream" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <form className="card-glass-dark text-card-foreground shadow-float" onSubmit={(e) => e.preventDefault()}>
            <h3 className="font-display text-xl font-bold text-cream">Demo so'rash</h3>
            <p className="mt-1 text-xs text-cream/70">Formani to'ldiring — biz bog'lanamiz.</p>
            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ism" />
                <Field label="Familiya" />
              </div>
              <Field label="Ta'lim muassasasi" />
              <Field label="Email" type="email" />
              <Field label="Telefon" type="tel" />
              <button
                type="submit"
                className="mt-1 w-full rounded-full bg-leaf text-primary-foreground shadow-glow font-semibold transition hover:brightness-110 px-6 py-3 text-sm"
              >
                So'rov yuborish →
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
