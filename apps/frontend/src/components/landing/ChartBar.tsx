import * as React from "react";

interface ChartBarProps {
  heightPercent: number;
  isNegative?: boolean;
}

export function ChartBar({ heightPercent, isNegative = false }: ChartBarProps) {
  return (
    <span
      className={`flex-1 rounded-sm ${isNegative ? "bg-destructive/80" : "bg-leaf"}`}
      style={{ height: `${heightPercent}%` }}
    />
  );
}

interface IndicatorLineProps {
  isEven: boolean;
}

export function IndicatorLine({ isEven }: IndicatorLineProps) {
  return (
    <span
      className={`h-0.5 flex-1 rounded-full ${isEven ? "bg-leaf" : "bg-destructive/70"}`}
    />
  );
}
