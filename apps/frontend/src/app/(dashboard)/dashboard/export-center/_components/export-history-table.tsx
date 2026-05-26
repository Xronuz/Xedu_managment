'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  MoreHorizontal,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  FileJson,
  FileText,
} from 'lucide-react';
import type { ExportJob, ExportJobStatus, ExportFormat } from '@/lib/api/export-center';
import { exportCenterApi } from '@/lib/api/export-center';
import { useToast } from '@/components/ui/use-toast';
import { StandardEmptyState } from '@/components/ui/standard-empty-state';

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
};

interface ExportHistoryTableProps {
  jobs: ExportJob[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function ExportHistoryTable({ jobs, isLoading, onRefresh }: ExportHistoryTableProps) {
  const { toast } = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await exportCenterApi.cancelExport(id);
      toast({ title: 'Eksport bekor qilindi' });
      onRefresh();
    } catch (err: any) {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Bekor qilishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownload = (job: ExportJob) => {
    if (job.status !== 'completed' || !job.fileUrl) return;
    const url = exportCenterApi.downloadExport(job.id);
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <StandardEmptyState
        icon={Download}
        title="Hali eksport yo'q"
        description="Yangi eksport yaratish uchun yuqoridagi tugmani bosing"
      />
    );
  }

  return (
    <div className="rounded-xl border bg-xedu-bg-elevated">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Entity</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Sana</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const status = STATUS_CONFIG[job.status];
            const StatusIcon = status.icon;
            const FormatIcon = FORMAT_ICONS[job.format];

            return (
              <TableRow key={job.id}>
                <TableCell className="font-medium">
                  {ENTITY_LABELS[job.entity] || job.entity}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <FormatIcon className="h-4 w-4 text-xedu-slate-500" />
                    <span className="text-sm uppercase">{job.format}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-xedu-slate-500">{job.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-xedu-slate-500">
                  {new Date(job.createdAt).toLocaleDateString('uz-UZ')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {job.status === 'completed' && job.fileUrl && (
                        <DropdownMenuItem onClick={() => handleDownload(job)}>
                          <Download className="mr-2 h-4 w-4" />
                          Yuklab olish
                        </DropdownMenuItem>
                      )}
                      {(job.status === 'queued' || job.status === 'processing') && (
                        <DropdownMenuItem
                          onClick={() => handleCancel(job.id)}
                          disabled={cancellingId === job.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Bekor qilish
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
