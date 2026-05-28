'use client';
import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { demoRequestsApi } from "@/lib/api/super-admin";

const campusHero = '/landing/campus-hero.jpg';

const schema = z.object({
  firstName:   z.string().min(1, "Ism kiriting"),
  lastName:    z.string().min(1, "Familiya kiriting"),
  institution: z.string().min(2, "Muassasa nomini kiriting"),
  email:       z.string().email("Email noto'g'ri"),
  phone:       z.string().min(7, "Telefon raqam kiriting"),
});
type FormData = z.infer<typeof schema>;

function Field({
  label, type = "text", error,
  registration,
}: {
  label: string; type?: string; error?: string;
  registration: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className="block">
      <span className="text-label-sm uppercase tracking-wider text-cream/55">{label}</span>
      <input
        type={type}
        className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm text-cream outline-none transition focus:border-leaf bg-cream/[0.04] ${
          error ? "border-red-400/60" : "border-cream/15"
        }`}
        {...registration}
      />
      {error && <p className="mt-0.5 text-[11px] text-red-300">{error}</p>}
    </label>
  );
}

export function DemoCTA() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    await demoRequestsApi.submit(data);
    setSubmitted(true);
  };

  return (
    <section className="relative min-h-full px-5 pt-[68px] pb-28 md:px-10 lg:px-14 bg-background">
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
          {/* left */}
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

          {/* right — form */}
          {submitted ? (
            <div className="card-glass-dark flex flex-col items-center justify-center gap-4 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-leaf/25">
                <CheckCircle2 className="h-7 w-7 text-cream" />
              </div>
              <h3 className="font-display text-xl font-bold text-cream">So'rovingiz qabul qilindi!</h3>
              <p className="text-sm text-cream/70">
                24 soat ichida sizga bog'lanamiz.
              </p>
            </div>
          ) : (
            <form
              className="card-glass-dark text-card-foreground shadow-float"
              onSubmit={handleSubmit(onSubmit)}
            >
              <h3 className="font-display text-xl font-bold text-cream">Demo so'rash</h3>
              <p className="mt-1 text-xs text-cream/70">Formani to'ldiring — biz bog'lanamiz.</p>
              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ism"      error={errors.firstName?.message}   registration={register("firstName")} />
                  <Field label="Familiya" error={errors.lastName?.message}    registration={register("lastName")} />
                </div>
                <Field label="Ta'lim muassasasi" error={errors.institution?.message} registration={register("institution")} />
                <Field label="Email"   type="email" error={errors.email?.message} registration={register("email")} />
                <Field label="Telefon" type="tel"   error={errors.phone?.message} registration={register("phone")} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 w-full rounded-full bg-leaf text-primary-foreground shadow-glow font-semibold transition hover:brightness-110 px-6 py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Yuborilmoqda...</>
                  ) : (
                    "So'rov yuborish →"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
