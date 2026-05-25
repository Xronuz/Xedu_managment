'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User, School, MonitorPlay } from 'lucide-react';

export interface ConflictDetail {
  type: 'teacher' | 'room' | 'class';
  message: string;
  slotId?: string;
}

interface ConflictModalProps {
  open: boolean;
  onClose: () => void;
  conflicts: ConflictDetail[];
  context?: string;
}

const TYPE_META: Record<ConflictDetail['type'], { label: string; icon: React.ReactNode; color: string }> = {
  teacher: {
    label: "O'qituvchi ziddiyati",
    icon: <User className="h-4 w-4" />,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  room: {
    label: 'Xona ziddiyati',
    icon: <MonitorPlay className="h-4 w-4" />,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  class: {
    label: 'Sinf ziddiyati',
    icon: <School className="h-4 w-4" />,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
  },
};

export function ConflictModal({ open, onClose, conflicts, context }: ConflictModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Ziddiyatlar aniqlandi ({conflicts.length} ta)
          </DialogTitle>
          <DialogDescription>
            {context ?? 'Quyidagi ziddiyatlar hal etilmaguncha saqlash mumkin emas.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {conflicts.map((c, i) => {
            const meta = TYPE_META[c.type];
            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${meta.color}`}
              >
                <div className="mt-0.5 shrink-0">{meta.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold">{meta.label}</p>
                  <p className="opacity-90 mt-0.5">{c.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Tushundim
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
