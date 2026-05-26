'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  RotateCcw,
  Eye,
  Filter,
  X,
} from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
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

interface ExportHistoryTableProps {
  jobs: ExportJob[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewDetail?: (job: ExportJob) => void;
}

export function ExportHistoryTable({ jobs, isLoading, onRefresh, onViewDetail }: ExportHistoryTableProps) {
  const { toast } = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filterStatus && job.status !== filterStatus) return false;
      if (filterEntity && job.entity !== filterEntity) return false;
      if (filterDateFrom) {
        const d = new Date(job.createdAt);
        if (d < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const d = new Date(job.createdAt);
        if (d > new Date(filterDateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [jobs, filterStatus, filterEntity, filterDateFrom, filterDateTo]);

  const hasFilters = filterStatus || filterEntity || filterDateFrom || filterDateTo;

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

  const handleRetry = async (job: ExportJob) => {
    setRetryingId(job.id);
    try {
      await exportCenterApi.retryExport(job);
      toast({ title: 'Eksport qayta ishga tushirildi' });
      onRefresh();
    } catch (err: any) {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Qayta ishga tushirishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setRetryingId(null);
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
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filterlar
          {hasFilters && (
            <span className="ml-0.5 text-2xs font-bold px-1 py-0 rounded-full bg-xedu-primary text-white">
              {[filterStatus, filterEntity, filterDateFrom, filterDateTo].filter(Boolean).length}
            </span>
          )}
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xedu-slate-500"
            onClick={() => {
              setFilterStatus('');
              setFilterEntity('');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Tozalash
          </Button>
        )}

        <span className="text-xs text-xedu-slate-500 ml-auto">
          {filteredJobs.length} / {jobs.length} ta
        </span>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-xedu-bg-elevated">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Barcha statuslar</SelectItem>
              <SelectItem value="queued">Navbatda</SelectItem>
              <SelectItem value="processing">Jarayonda</SelectItem>
              <SelectItem value="completed">Tayyor</SelectItem>
              <SelectItem value="failed">Xatolik</SelectItem>
              <SelectItem value="cancelled">Bekor qilingan</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Barcha entitylar</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 text-xs w-[130px]"
            />
            <span className="text-xs text-xedu-slate-400">–</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 text-xs w-[130px]"
            />
          </div>
        </div>
      )}

      {filteredJobs.length === 0 ? (
        <StandardEmptyState
          icon={Filter}
          title="Eksportlar topilmadi"
          description="Tanlangan filterlar bo&apos;yicha hech narsa topilmadi"
        />
      ) : (
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
              {filteredJobs.map((job) => {
                const status = STATUS_CONFIG[job.status];
                const StatusIcon = status.icon;
                const FormatIcon = FORMAT_ICONS[job.format];

                return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer"
                    onClick={() => onViewDetail?.(job)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {ENTITY_LABELS[job.entity] || job.entity}
                        <CopyButton value={job.id} label="Eksport ID" size="icon" />
                      </div>
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
                      {job.error && (
                        <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[120px]" title={job.error}>
                          {job.error}
                        </p>
                      )}
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewDetail?.(job)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Tafsilotlar
                          </DropdownMenuItem>
                          {job.status === 'completed' && job.fileUrl && (
                            <DropdownMenuItem onClick={() => handleDownload(job)}>
                              <Download className="mr-2 h-4 w-4" />
                              Yuklab olish
                            </DropdownMenuItem>
                          )}
                          {job.status === 'failed' && (
                            <DropdownMenuItem
                              onClick={() => handleRetry(job)}
                              disabled={retryingId === job.id}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Qayta urinish
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
      )}
    </div>
  );
}
