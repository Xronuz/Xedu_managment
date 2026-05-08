'use client';

import { useState, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   USE MOBILE WORKSPACE
   Hook for responsive workspace behavior.

   Provides:
   - breakpoint detection
   - mobile-optimized state toggles
   - collapsible sections
   - gesture-safe spacing
   - priority-first rendering helpers
   ═══════════════════════════════════════════════════════════════════════════════ */

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function useMobileWorkspace() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      let bp: Breakpoint = 'xs';
      if (w >= 1280) bp = 'xl';
      else if (w >= 1024) bp = 'lg';
      else if (w >= 768) bp = 'md';
      else if (w >= 640) bp = 'sm';
      setBreakpoint(bp);
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  /* Collapsible sections */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isCollapsed = useCallback(
    (id: string) => collapsed[id] ?? false,
    [collapsed]
  );

  /* Mobile panel overlay state */
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,

    /* Collapsible sections */
    collapsed,
    toggleSection,
    isCollapsed,

    /* Mobile panel */
    mobilePanelOpen,
    setMobilePanelOpen,

    /* Responsive helpers */
    hideOnMobile: isMobile ? ('hidden' as const) : undefined,
    showOnMobile: isMobile ? undefined : ('hidden' as const),
  };
}
