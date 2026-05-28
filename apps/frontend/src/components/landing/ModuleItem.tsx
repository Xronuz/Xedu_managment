import * as React from "react";

interface ModuleItemProps {
  num: string;
  title: string;
  description: string;
  Icon: React.ElementType;
}

export function ModuleItem({ num, title, description, Icon }: ModuleItemProps) {
  return (
    <div className="group relative overflow-hidden card-glass-module cursor-pointer">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-semibold text-leaf-deep">{num}</span>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-leaf/20 text-leaf-deep">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <h3 className="mt-3 font-display text-xl font-bold">{title}</h3>
      <p className="mt-1 text-xs text-foreground/65">{description}</p>
      <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-leaf/20 blur-2xl transition group-hover:bg-leaf/35" />
    </div>
  );
}
