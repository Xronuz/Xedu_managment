import { apiClient } from './client';

export type ExportEntity =
  | 'schedules'
  | 'teaching_loads'
  | 'payroll'
  | 'users'
  | 'analytics_summary'
  | 'classes'
  | 'subjects'
  | 'rooms'
  | 'attendance'
  | 'teacher_attendance'
  | 'substitutions'
  | 'leave_requests'
  | 'workload_report'
  | 'timetable_analytics';

export type ExportFormat = 'csv' | 'xlsx' | 'json';
export type ExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExportJob {
  id: string;
  entity: ExportEntity;
  format: ExportFormat;
  status: ExportJobStatus;
  progress: number;
  fileUrl: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
}

export interface ExportJobListResponse {
  data: ExportJob[];
  total: number;
}

export interface ExportFilters {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  weekType?: string;
}

export const exportCenterApi = {
  createExport: async (dto: { entity: ExportEntity; format: ExportFormat } & ExportFilters): Promise<ExportJob> => {
    const { data } = await apiClient.post('/exports', dto);
    return data;
  },

  listExports: async (params?: { page?: number; limit?: number }): Promise<ExportJobListResponse> => {
    const { data } = await apiClient.get('/exports', { params });
    return data;
  },

  getExport: async (id: string): Promise<ExportJob> => {
    const { data } = await apiClient.get(`/exports/${id}`);
    return data;
  },

  cancelExport: async (id: string): Promise<ExportJob> => {
    const { data } = await apiClient.post(`/exports/${id}/cancel`);
    return data;
  },

  downloadExport: (id: string): string => {
    return `${process.env.NEXT_PUBLIC_API_URL}/v1/exports/${id}/download`;
  },
};
