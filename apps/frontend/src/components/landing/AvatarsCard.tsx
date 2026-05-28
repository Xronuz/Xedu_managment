import * as React from "react";

export function AvatarsCard() {
  return (
    <div className="flex items-center gap-1.5 rounded-full glass-dark p-1.5 pr-3">
      {["👩‍🏫", "👨‍🎓"].map((e, i) => (
        <div
          key={i}
          className="relative grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-base"
        >
          {e}
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-label-micro font-bold text-cream">
            {i === 0 ? 12 : 2}
          </span>
        </div>
      ))}
      <span className="text-xs text-cream/80">4+ jamoa</span>
    </div>
  );
}
