'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * PageTransition — Subtle fade-in wrapper for dashboard content
 *
 * Rules:
 * - fade only, no dramatic animation
 * - preserve responsiveness
 * - avoid full-page flicker
 * - 150ms duration (xedu token)
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      className="transition-opacity duration-[var(--xedu-duration)] ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {children}
    </div>
  );
}
