import * as React from "react";
import { Building2, ArrowUpRight } from "lucide-react";

interface BranchCellProps {
  name: string;
  students: string;
  staff: string;
}

export function BranchCell({ name, students, staff }: BranchCellProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-leaf/20 text-leaf">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold text-sm">{name}</div>
          <div className="text-label-sm text-foreground/60">{students} · {staff}</div>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-foreground/50" />
    </div>
  );
}

interface ExtraServiceCellProps {
  title: string;
  description: string;
  icon: React.ElementType;
}

export function ExtraServiceCell({ title, description, icon: Icon }: ExtraServiceCellProps) {
  return (
    <div className="flex flex-col items-center text-center rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
      <Icon className="h-5 w-5 text-leaf" />
      <div className="mt-2 font-display text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
