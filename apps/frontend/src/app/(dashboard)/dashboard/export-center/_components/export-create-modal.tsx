'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react';
import { exportCenterApi, type ExportEntity, type ExportFormat } from '@/lib/api/export-center';
import { useToast } from '@/components/ui/use-toast';

const ENTITIES: { value: ExportEntity; label: string }[] = [
  { value: 'schedules', label: 'Dars jadvali' },
  { value: 'teaching_loads', label: "O'quv yuklamalari" },
  { value: 'payroll', label: 'Ish haqi' },
  { value: 'users', label: 'Foydalanuvchilar' },
  { value: 'analytics_summary', label: 'Analytics xulosasi' },
];

const FORMATS: { value: ExportFormat; label: string; icon: React.ElementType }[] = [
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV (.csv)', icon: FileText },
  { value: 'json', label: 'JSON (.json)', icon: FileJson },
];

interface ExportCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function ExportCreateModal({ open, onOpenChange, onCreated }: ExportCreateModalProps) {
  const [entity, setEntity] = useState<ExportEntity>('schedules');
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await exportCenterApi.createExport({ entity, format });
      toast({
        title: 'Eksport yaratildi',
        description: `${ENTITIES.find(e => e.value === entity)?.label} — ${FORMATS.find(f => f.value === format)?.label}`,
      });
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Eksport yaratishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Yangi eksport
          </DialogTitle>
          <DialogDescription>
            Ma&apos;lumotlarni eksport qilish uchun entity va formatni tanlang
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entity} onValueChange={(v) => setEntity(v as ExportEntity)}>
              <SelectTrigger>
                <SelectValue placeholder="Entity tanlang" />
              </SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
                      format === f.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Bekor qilish
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
            <Download className="h-4 w-4" />
            {isLoading ? 'Yaratilmoqda...' : 'Eksport qilish'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
