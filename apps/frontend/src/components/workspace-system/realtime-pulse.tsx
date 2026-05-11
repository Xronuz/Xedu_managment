'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { cn } from '@/lib/utils';

interface RealtimePulseProps {
  /** Socket events to listen for (e.g. ['discipline:created', 'leave-request:updated']) */
  events: string[];
  /** How long the pulse remains visible after an event (ms) */
  fadeAfterMs?: number;
  className?: string;
  /** Label shown next to the dot. Omit for icon-only mode. */
  label?: string;
}

/**
 * RealtimePulse — A calm, institutional live-data indicator.
 *
 * Shows a subtle emerald dot when a relevant socket event was received
 * within the last `fadeAfterMs` milliseconds. The dot fades gently;
 * no blinking, no counters, no dopamine UI.
 *
 * Mount near table headers, widget titles, or panel headings on
 * operational surfaces (Alerts, Approvals, Director Feed, etc.).
 */
export function RealtimePulse({
  events,
  fadeAfterMs = 4000,
  className,
  label = 'Yangilandi',
}: RealtimePulseProps) {
  const [pulsing, setPulsing] = useState(false);
  const { on } = useSocket({ namespace: '/', enabled: true });

  const trigger = useCallback(() => {
    setPulsing(true);
  }, []);

  useEffect(() => {
    const unsubscribers = events.map((event) => on(event, trigger));
    return () => {
      unsubscribers.forEach((u) => u?.());
    };
  }, [events, on, trigger]);

  useEffect(() => {
    if (!pulsing) return;
    const t = setTimeout(() => setPulsing(false), fadeAfterMs);
    return () => clearTimeout(t);
  }, [pulsing, fadeAfterMs]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase',
        'transition-opacity duration-700',
        pulsing ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75',
            pulsing && 'animate-ping',
          )}
          style={{ animationDuration: '2s' }}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-emerald-700 dark:text-emerald-400">{label}</span>
    </div>
  );
}
