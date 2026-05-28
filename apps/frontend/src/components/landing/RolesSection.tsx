import * as React from "react";
import { User, Building2, GraduationCap, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { SectionEyebrow } from "./StatBadge";

const rolesBg = '/landing/roles-bg.png';

export function RolesSection() {
  const roles = [
    {
      icon: User,
      t: "Direktor",
      d: "Barcha filiallarning operatsion ko'rsatkichlarini real vaqtda kuzating.",
      features: ["KPI dashboard", "Moliyaviy hisobotlar", "Filial taqqoslash", "Strategik tahlillar"],
    },
    {
      icon: Building2,
      t: "Filial boshlig'i",
      d: "O'z filialingizning barcha jarayonlarini boshqaring va nazorat qiling.",
      features: ["Dars jadvali", "Xodimlar boshqaruvi", "Davomat nazorati", "Moliyaviy hisobot"],
    },
    {
      icon: GraduationCap,
      t: "O'qituvchi",
      d: "Darslarni rejalashtiring, baholang va o'quvchilar rivojlanishini kuzating.",
      features: ["Baholash tizimi", "Dars rejalari", "O'quvchi yutuqlari", "Kommunikatsiya"],
    },
    {
      icon: Users,
      t: "Ota-ona",
      d: "Farzandingizning davomati, baholari va to'lov holatini kuzating.",
      features: ["Davomat va baholar", "To'lov ma'lumotlari", "Bildirishnomalar", "Muloqot va izohlar"],
    },
  ];

  return (
    <section className="relative min-h-full bg-background">
      {/* Light campus bg */}
      <img src={rolesBg} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ minHeight: '100%' }} aria-hidden />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(240,250,244,0.15) 0%, rgba(230,245,236,0.35) 100%)" }} aria-hidden />

      <div className="relative px-5 pt-[68px] pb-28 md:px-10 lg:px-14">
        <SectionEyebrow label="Rollar" />
        <h2 className="mt-2 font-display text-4xl font-bold leading-tight md:text-5xl">
          Har bir rolda <span className="text-leaf">samaradorlik.</span>
        </h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Xedu platformasi har bir foydalanuvchi uchun mos vositalar va imkoniyatlarni taqdim etadi.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <div
              key={r.t}
              className="flex flex-col rounded-3xl bg-white/80 border border-foreground/8 p-6 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 cursor-pointer"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf/10 text-leaf">
                <r.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{r.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.d}</p>
              <ul className="mt-4 space-y-2">
                {r.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-leaf shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="mt-auto pt-5 flex items-center gap-1.5 text-sm font-semibold text-leaf-deep hover:text-leaf transition">
                Batafsil ko'rish <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
