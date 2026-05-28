import * as React from "react";

export function SectionEyebrow({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-leaf/15 px-3 py-1 text-xs font-medium text-leaf-deep">
      <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
      {label}
    </div>
  );
}

export function StatRow({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-cream/90">
      <span className="inline-flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="font-semibold text-cream">{value}</span>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-label-xs uppercase tracking-wider text-cream/55">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

export function DockAction({
  icon: Icon, label, big = false,
}: { icon: React.ElementType; label: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="text-xs text-cream/70">{label}</div>
      {big ? (
        <Icon />
      ) : (
        <div className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream">
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
