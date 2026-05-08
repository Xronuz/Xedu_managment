'use client';

import { useEffect, useRef, useState } from 'react';
import { SectionHeader } from './section-header';

const stats = [
  { value: 50, suffix: '+', label: 'Maktab va o\'quv markazi' },
  { value: 200, suffix: '+', label: 'Filial' },
  { value: 45000, suffix: '+', label: 'O\'quvchi' },
  { value: 99.9, suffix: '%', label: 'Platforma mavjudligi' },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1800;
          const start = performance.now();

          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  const display = target >= 1000
    ? count.toLocaleString('en-US')
    : target % 1 !== 0
      ? (count / 10).toFixed(1)
      : count.toString();

  return (
    <span ref={ref} className="tabular-nums">
      {display}{suffix}
    </span>
  );
}

export function ProofSection() {
  return (
    <section className="relative overflow-hidden surface-atmospheric">
      {/* Subtle top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xedu-slate-200/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <SectionHeader
          label="Institutsional ko'lam"
          title="Ta'lim boshqaruviga ishonch bilan yondashuv"
          description="Xedu yirik ta'lim guruhlari va ko'p filialli tashkilotlarning operatsion infratuzilmasi sifatida xizmat qiladi."
        />

        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="relative group"
            >
              <div className="relative rounded-2xl bg-white shadow-premium-sm p-7 sm:p-8 transition-all duration-300 hover:shadow-premium-md">
                {/* Edge highlight */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/80 to-transparent opacity-60 pointer-events-none" />

                <p className="relative text-3xl sm:text-[2.5rem] font-bold text-xedu-slate-900 tracking-[-0.02em] leading-none">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="relative mt-3 text-[12px] sm:text-[13px] text-xedu-slate-500 leading-relaxed">
                  {stat.label}
                </p>

                {/* Subtle bottom accent */}
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-xedu-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
