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
          const duration = 1500;
          const start = performance.now();

          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
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
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
}

export function ProofSection() {
  return (
    <section className="bg-xedu-bg dark:bg-xedu-slate-950 border-y border-xedu-slate-100 dark:border-xedu-slate-800/50">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <SectionHeader
          label="Institutsional ko'lam"
          title="Ta'lim boshqaruviga ishonch bilan yondashuv"
          description="Xedu yirik ta'lim guruhlari va ko'p filialli tashkilotlarning operatsion infratuzilmasi sifatida xizmat qiladi."
        />

        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-6 rounded-2xl bg-white dark:bg-xedu-slate-900 border border-xedu-slate-100 dark:border-xedu-slate-800"
            >
              <p className="text-3xl sm:text-4xl font-bold text-xedu-slate-900 dark:text-white tracking-tight">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-[12px] sm:text-[13px] text-xedu-slate-500 dark:text-xedu-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
