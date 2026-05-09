'use client';

import { memo } from 'react';
import { ResponsiveContainer } from 'recharts';

/* ═══════════════════════════════════════════════════════════════════════════════
   MEMO CHART
   Performance wrapper for Recharts to prevent parent-rerender cascades.

   Usage:
     <MemoChart height={260}>
       <AreaChart data={data}>...</AreaChart>
     </MemoChart>

   Rules:
   - Wrap ALL Recharts usage in operational workspaces
   - Memoize the `data` prop before passing
   - Prefer this over bare ResponsiveContainer
   ═══════════════════════════════════════════════════════════════════════════════ */

interface MemoChartProps {
  height?: number | string;
  width?: number | string;
  minHeight?: number;
  children: React.ReactNode;
  className?: string;
}

export const MemoChart = memo(function MemoChart({
  height = 260,
  width = '100%',
  minHeight = 180,
  children,
  className,
}: MemoChartProps) {
  return (
    <div className={className} style={{ minHeight }}>
      <ResponsiveContainer width={width} height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
});
