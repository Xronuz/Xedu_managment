'use client';

import { useState, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   USE DEBOUNCED VALUE
   Delays value updates to reduce expensive re-computations.

   Usage:
     const debouncedQuery = useDebouncedValue(searchQuery, 300);
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
