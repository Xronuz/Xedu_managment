'use client';

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════════
   TREND / DELTA INDICATOR
   Subtle directional indicator for executive density.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type TrendDirection = 'up' | 'down' | 'stable';

interface TrendIndicatorProps {
  direction: TrendDirection;
  value?: string | number;
  invert?: boolean;
  size?: 'sm' | 'xs';
  className?: string;
}

export function TrendIndicator({
  direction,
  value,
  invert = false,
  size = 'xs',
  className,
}: TrendIndicatorProps) {
  const effectiveDir = invert
    ? direction === 'up' ? 'down' : direction === 'down' ? 'up' : 'stable'
    : direction;

  const Icon = effectiveDir === 'up' ? ArrowUpRight : effectiveDir === 'down' ? ArrowDownRight : Minus;

  const color =
    effectiveDir === 'up' ? 'text-xedu-primary' :
    effectiveDir === 'down' ? 'text-red-500' :
    'text-xedu-slate-300';

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-[10px]';

  return (
    <span className={cn('inline-flex items-center gap-0.5', color, className)}>
      <Icon className={iconSize} />
      {value !== undefined && (
        <span className={cn('font-semibold tabular-nums', textSize)}>{value}</span>
      )}
    </span>
  );
}

/* ── Sparkline micro-chart (SVG) ────────────────────────────────────────────── */

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ data, width = 48, height = 16, className }: SparklineProps) {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const trend = data[data.length - 1] >= data[0] ? 'up' : 'down';
  const strokeColor = trend === 'up' ? 'currentColor' : '#EF4444';

  return (
    <svg
      width={width}
      height={height}
      className={cn('shrink-0', trend === 'up' ? 'text-xedu-primary' : 'text-red-400', className)}
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
