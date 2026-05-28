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
import { Input } from '@/components/ui/input';
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

const ENTITIES: { value: ExportEntity; label: string; filters: string[] }[] = [
  { value: 'schedules', label: 'Dars jadvali', filters: ['branchId', 'status', 'weekType'] },
  { value: 'teaching_loads', label: "O'quv yuklamalari", filters: ['branchId', 'status'] },
  { value: 'payroll', label: 'Ish haqi', filters: ['dateFrom', 'dateTo'] },
  { value: 'users', label: 'Foydalanuvchilar', filters: ['branchId', 'status'] },
  { value: 'analytics_summary', label: 'Analytics xulosasi', filters: ['branchId'] },
  { value: 'classes', label: 'Sinflar', filters: ['branchId'] },
  { value: 'subjects', label: 'Fanlar', filters: ['branchId'] },
  { value: 'rooms', label: 'Xonalar', filters: ['branchId'] },
  { value: 'attendance', label: 'Davomat', filters: ['branchId', 'dateFrom', 'dateTo', 'status'] },
  { value: 'teacher_attendance', label: "O'qituvchi davomati", filters: ['branchId', 'dateFrom', 'dateTo', 'status'] },
  { value: 'substitutions', label: "O'qituvchi almashtirish", filters: ['branchId', 'dateFrom', 'dateTo', 'status'] },
  { value: 'leave_requests', label: "Ta'til so'rovlari", filters: ['branchId', 'dateFrom', 'dateTo', 'status'] },
  { value: 'workload_report', label: 'Ish yuklamalari hisoboti', filters: ['branchId'] },
  { value: 'timetable_analytics', label: 'Jadval analitikasi', filters: ['branchId', 'weekType'] },
];

const FORMATS: { value: ExportFormat; label: string; icon: React.ElementType }[] = [
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV (.csv)', icon: FileText },
  { value: 'json', label: 'JSON (.json)', icon: FileJson },
];

const STATUS_OPTIONS: Record<string, { value: string; label: string }[]> = {
  schedules: [
    { value: 'draft', label: 'Qoralama' },
    { value: 'validated', label: 'Tekshirilgan' },
    { value: 'published', label: 'Nashr etilgan' },
    { value: 'archived', label: 'Arxivlangan' },
  ],
  teaching_loads: [
    { value: 'draft', label: 'Qoralama' },
    { value: 'approved', label: 'Tasdiqlangan' },
    { value: 'archived', label: 'Arxivlangan' },
  ],
  users: [
    { value: 'active', label: 'Faol' },
    { value: 'inactive', label: 'Nofaol' },
  ],
  attendance: [
    { value: 'present', label: 'Keldi' },
    { value: 'absent', label: 'Kelmadi' },
    { value: 'late', label: 'Kechikdi' },
    { value: 'excused', label: 'Sababli' },
  ],
  teacher_attendance: [
    { value: 'present', label: 'Keldi' },
    { value: 'absent', label: 'Kelmadi' },
    { value: 'late', label: 'Kechikdi' },
    { value: 'excused', label: 'Sababli' },
    { value: 'substituted', label: 'Almashtirilgan' },
  ],
  substitutions: [
    { value: 'proposed', label: 'Taklif qilingan' },
    { value: 'approved', label: 'Tasdiqlangan' },
    { value: 'applied', label: 'Qo\'llangan' },
    { value: 'rejected', label: 'Rad etilgan' },
    { value: 'cancelled', label: 'Bekor qilingan' },
  ],
  leave_requests: [
    { value: 'pending', label: 'Kutilmoqda' },
    { value: 'approved', label: 'Tasdiqlangan' },
    { value: 'rejected', label: 'Rad etilgan' },
  ],
};

const WEEKTYPE_OPTIONS = [
  { value: 'all', label: 'Barcha' },
  { value: 'numerator', label: 'Juft' },
  { value: 'denominator', label: 'Toq' },
];

interface ExportCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function ExportCreateModal({ open, onOpenChange, onCreated }: ExportCreateModalProps) {
  const [entity, setEntity] = useState<ExportEntity>('schedules');
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [branchId, setBranchId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [weekType, setWeekType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const entityConfig = ENTITIES.find(e => e.value === entity)!;
  const activeFilters = entityConfig.filters;

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await exportCenterApi.createExport({
        entity,
        format,
        ...(activeFilters.includes('branchId') && branchId ? { branchId } : {}),
        ...(activeFilters.includes('dateFrom') && dateFrom ? { dateFrom } : {}),
        ...(activeFilters.includes('dateTo') && dateTo ? { dateTo } : {}),
        ...(activeFilters.includes('status') && status ? { status } : {}),
        ...(activeFilters.includes('weekType') && weekType ? { weekType } : {}),
      });
      toast({
        title: 'Eksport navbatga qo‘yildi',
        description: `${entityConfig.label} — ${FORMATS.find(f => f.value === format)?.label}. Tayyor bo‘lganda yuklab olish mumkin.`,
      });
      onCreated();
      onOpenChange(false);
      // Reset filters
      setBranchId('');
      setDateFrom('');
      setDateTo('');
      setStatus('');
      setWeekType('');
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Yangi eksport
          </DialogTitle>
          <DialogDescription>
            Ma&apos;lumotlarni eksport qilish uchun sozlamalarni tanlang
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entity} onValueChange={(v) => {
              setEntity(v as ExportEntity);
              setStatus('');
              setWeekType('');
            }}>
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

          {/* Conditional filters */}
          {activeFilters.includes('branchId') && (
            <div className="space-y-2">
              <Label>Filial ID (ixtiyoriy)</Label>
              <Input
                placeholder="Filial ID kiriting"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              />
            </div>
          )}

          {activeFilters.includes('dateFrom') && (
            <div className="space-y-2">
              <Label>Boshlanish sanasi</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
          )}

          {activeFilters.includes('dateTo') && (
            <div className="space-y-2">
              <Label>Tugash sanasi</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          )}

          {activeFilters.includes('status') && STATUS_OPTIONS[entity] && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Barcha</SelectItem>
                  {STATUS_OPTIONS[entity].map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeFilters.includes('weekType') && (
            <div className="space-y-2">
              <Label>Hafta turi</Label>
              <Select value={weekType} onValueChange={setWeekType}>
                <SelectTrigger>
                  <SelectValue placeholder="Hafta turini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Barcha</SelectItem>
                  {WEEKTYPE_OPTIONS.map((w) => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
