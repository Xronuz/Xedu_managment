'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Download,
  RotateCcw,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  FileJson,
  FileText,
  Calendar,
  User,
  Hash,
} from 'lucide-react';
import type { ExportJob, ExportJobStatus, ExportFormat } from '@/lib/api/export-center';
import { exportCenterApi } from '@/lib/api/export-center';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG: Record<ExportJobStatus, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Navbatda', icon: Clock, variant: 'secondary' },
  processing: { label: 'Jarayonda', icon: Loader2, variant: 'default' },
  completed: { label: 'Tayyor', icon: CheckCircle, variant: 'default' },
  failed: { label: 'Xatolik', icon: AlertCircle, variant: 'destructive' },
  cancelled: { label: 'Bekor qilingan', icon: XCircle, variant: 'outline' },
};

const FORMAT_ICONS: Record<ExportFormat, React.ElementType> = {
  xlsx: FileSpreadsheet,
  csv: FileText,
  json: FileJson,
};

const ENTITY_LABELS: Record<string, string> = {
  schedules: 'Dars jadvali',
  teaching_loads: "O'quv yuklamalari",
  payroll: 'Ish haqi',
  users: 'Foydalanuvchilar',
  analytics_summary: 'Analytics xulosasi',
  classes: 'Sinflar',
  subjects: 'Fanlar',
  rooms: 'Xonalar',
  attendance: 'Davomat',
  teacher_attendance: "O'qituvchi davomati",
  substitutions: "O'qituvchi almashtirish",
  leave_requests: "Ta'til so'rovlari",
  workload_report: 'Ish yuklamalari hisoboti',
  timetable_analytics: 'Jadval analitikasi',
};

interface ExportJobDetailProps {
  job: ExportJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
}

export function ExportJobDetail({ job, open, onOpenChange, onRetry }: ExportJobDetailProps) {
  const { toast } = useToast();

  if (!job) return null;

  const status = STATUS_CONFIG[job.status];
  const StatusIcon = status.icon;
  const FormatIcon = FORMAT_ICONS[job.format];

  const handleDownload = () => {
    if (job.status !== 'completed' || !job.fileUrl) return;
    const url = exportCenterApi.downloadExport(job.id);
    window.open(url, '_blank');
  };

  const handleRetry = async () => {
    try {
      await exportCenterApi.retryExport(job);
      toast({ title: 'Eksport qayta ishga tushirildi' });
      onRetry?.();
    } catch (err: any) {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Qayta ishga tushirishda xatolik',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[440px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Eksport tafsilotlari</SheetTitle>
          <SheetDescription>
            {ENTITY_LABELS[job.entity] || job.entity} · {job.format.toUpperCase()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Status card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-xedu-slate-500">Status</span>
                <Badge variant={status.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-xedu-slate-500">Progress</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{job.progress}%</span>
                </div>
              </div>

              {job.error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold text-destructive mb-1">Xatolik</p>
                  <p className="text-xs text-destructive/80">{job.error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Hash className="h-4 w-4 text-xedu-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-xedu-slate-500">ID</p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">{job.id}</p>
                    <CopyButton value={job.id} label="ID" size="sm" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FormatIcon className="h-4 w-4 text-xedu-slate-400" />
                <div>
                  <p className="text-xs text-xedu-slate-500">Format</p>
                  <p className="text-sm font-medium uppercase">{job.format}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-xedu-slate-400" />
                <div>
                  <p className="text-xs text-xedu-slate-500">Yaratilgan sana</p>
                  <p className="text-sm font-medium">
                    {new Date(job.createdAt).toLocaleString('uz-UZ')}
                  </p>
                </div>
              </div>

              {job.completedAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-xedu-slate-400" />
                  <div>
                    <p className="text-xs text-xedu-slate-500">Tugallangan sana</p>
                    <p className="text-sm font-medium">
                      {new Date(job.completedAt).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-xedu-slate-400" />
                <div>
                  <p className="text-xs text-xedu-slate-500">Yaratuvchi ID</p>
                  <p className="text-sm font-medium">{job.createdBy}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {job.status === 'completed' && job.fileUrl && (
              <Button onClick={handleDownload} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Yuklab olish
              </Button>
            )}
            {job.status === 'failed' && (
              <Button onClick={handleRetry} variant="outline" className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" />
                Qayta urinish
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
