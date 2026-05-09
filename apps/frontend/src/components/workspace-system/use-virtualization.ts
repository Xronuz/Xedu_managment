'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   USE VIRTUALIZATION
   Windowing hook for large datasets. Renders only visible rows + overscan.

   Usage:
     const { virtualRows, containerRef, totalHeight } = useVirtualization({
       itemCount: rows.length,
       itemHeight: 40,
       overscan: 5,
     });

   Then render:
     <div ref={containerRef} style={{ overflow: 'auto', maxHeight: 600 }}>
       <div style={{ height: totalHeight }}>
         {virtualRows.map((vr) => (
           <div key={vr.index} style={{ position: 'absolute', top: vr.offset }}>
             {rows[vr.index]}
           </div>
         ))}
       </div>
     </div>
   ═══════════════════════════════════════════════════════════════════════════════ */

interface VirtualItem {
  index: number;
  offset: number;
}

interface UseVirtualizationOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
}

interface UseVirtualizationReturn {
  virtualRows: VirtualItem[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
}

export function useVirtualization({
  itemCount,
  itemHeight,
  overscan = 5,
}: UseVirtualizationOptions): UseVirtualizationReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => setScrollTop(el.scrollTop);
    const resizeObserver = new ResizeObserver((entries) => {
      setContainerHeight(entries[0]?.contentRect.height ?? 0);
    });

    setContainerHeight(el.clientHeight);
    el.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const totalHeight = itemCount * itemHeight;

  const virtualRows = useMemo(() => {
    if (containerHeight === 0) return [];

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const rows: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      rows.push({ index: i, offset: i * itemHeight });
    }
    return rows;
  }, [scrollTop, containerHeight, itemCount, itemHeight, overscan]);

  const scrollToIndex = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = index * itemHeight;
  }, [itemHeight]);

  return { virtualRows, containerRef, totalHeight, scrollToIndex };
}
