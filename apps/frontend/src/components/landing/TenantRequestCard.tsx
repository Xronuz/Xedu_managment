import * as React from "react";
import { BookOpen, MessageCircle, Send, Users } from "lucide-react";
import { DockAction } from "./StatBadge";

export function TenantRequestCard() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-2 flex items-center justify-between rounded-full glass-dark px-4 py-2 text-cream">
        <span className="text-sm">Yangi so'rovlar</span>
        <span className="flex items-center gap-2 text-sm">
          12 <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        </span>
      </div>
      <div className="card-glass-dark">
        <div className="flex items-start gap-3">
          <div>
            <h4 className="font-display text-base font-semibold text-cream">
              Yangi abituriyent<br />ro'yxati
            </h4>
            <p className="mt-1 text-xs text-cream/70">9-A sinf, Chilonzor filiali</p>
            <p className="text-xs text-cream/70">5 daqiqa oldin · CRM moduli</p>
          </div>
          <div className="ml-auto grid h-14 w-14 place-items-center rounded-2xl bg-cream/10">
            <BookOpen className="h-6 w-6 text-cream/80" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs">
            <div className="text-cream/60">Holat:</div>
            <div className="text-cream">Ko'rib chiqilmoqda</div>
          </div>
          <span className="rounded-full bg-cream/10 px-3 py-1.5 text-xs text-cream">Jarayonda ▾</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-cream/10 pt-3 text-center">
          <DockAction icon={MessageCircle} label="Chat" />
          <DockAction
            icon={() => (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-leaf text-primary-foreground">
                <Users className="h-4 w-4" />
              </div>
            )}
            label="O'qituvchi"
            big
          />
          <DockAction icon={Send} label="Yuborish" />
        </div>
      </div>
    </div>
  );
}
