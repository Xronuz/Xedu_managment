import { apiClient } from './client';

export interface TeachingLoad {
  id: string;
  schoolId: string;
  branchId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  hoursPerWeek: number;
  hoursPerYear?: number;
  semester?: string;
  groupType?: string;
  isSplitClass: boolean;
  coefficient: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  teacher?: { id: string; firstName: string; lastName: string };
  subject?: { id: string; name: string };
  class?: { id: string; name: string; gradeLevel: number };
  branch?: { id: string; name: string };
}

export interface ImportPreviewRow {
  row: number;
  teacherId?: string;
  teacherEmail?: string;
  subjectId?: string;
  subjectName?: string;
  classId?: string;
  className?: string;
  hoursPerWeek?: number;
  semester?: string;
  groupType?: string;
  isSplitClass?: boolean;
  coefficient?: number;
  notes?: string;
  errors: string[];
  valid: boolean;
}

export interface ImportPreviewResult {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportPreviewRow[];
}

export interface ImportCommitResult {
  created: number;
  skipped: number;
  errors: string[];
}

export const teachingLoadApi = {
  getAll: async (params?: {
    teacherId?: string;
    classId?: string;
    subjectId?: string;
    status?: string;
    groupType?: string;
    semester?: string;
  }): Promise<TeachingLoad[]> => {
    const { data } = await apiClient.get('/teaching-loads', { params });
    return data;
  },

  getOne: async (id: string): Promise<TeachingLoad> => {
    const { data } = await apiClient.get(`/teaching-loads/${id}`);
    return data;
  },

  create: async (payload: {
    teacherId: string;
    subjectId: string;
    classId: string;
    hoursPerWeek: number;
    hoursPerYear?: number;
    semester?: string;
    groupType?: string;
    isSplitClass?: boolean;
    coefficient?: number;
    notes?: string;
  }): Promise<TeachingLoad> => {
    const { data } = await apiClient.post('/teaching-loads', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    hoursPerWeek: number;
    hoursPerYear: number;
    semester: string;
    groupType: string;
    isSplitClass: boolean;
    coefficient: number;
    notes: string;
    status: string;
  }>): Promise<TeachingLoad> => {
    const { data } = await apiClient.patch(`/teaching-loads/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<{ message: string; id: string }> => {
    const { data } = await apiClient.delete(`/teaching-loads/${id}`);
    return data;
  },

  importPreview: async (file: File): Promise<ImportPreviewResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/teaching-loads/import/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  importCommit: async (rows: ImportPreviewRow[]): Promise<ImportCommitResult> => {
    const { data } = await apiClient.post('/teaching-loads/import/commit', { rows });
    return data;
  },

  // ── Workload aggregation endpoints ──────────────────────────────────────────
  getWorkloadSummary: async (): Promise<WorkloadSummary> => {
    const { data } = await apiClient.get('/teaching-loads/workload/summary');
    return data;
  },
  getTeacherWorkloads: async (): Promise<TeacherWorkload[]> => {
    const { data } = await apiClient.get('/teaching-loads/workload/teachers');
    return data;
  },
  getTeacherWorkloadDetail: async (teacherId: string): Promise<TeacherWorkloadDetail> => {
    const { data } = await apiClient.get(`/teaching-loads/workload/teachers/${teacherId}`);
    return data;
  },
};

// ── Workload types ────────────────────────────────────────────────────────────
export interface WorkloadSummary {
  totalTeachers: number;
  totalPlannedHours: number;
  totalContractualHours: number;
  balancedCount: number;
  underloadedCount: number;
  overloadedCount: number;
  missingContractCount: number;
  noLoadCount: number;
  avgUtilizationPercent: number;
  alerts: WorkloadAlert[];
}

export interface WorkloadAlert {
  type: 'underloaded' | 'overloaded' | 'missingContractHours' | 'noApprovedTeachingLoad';
  severity: 'warning' | 'danger';
  teacherId?: string;
  teacherName?: string;
  message: string;
}

export interface TeacherWorkload {
  teacherId: string;
  firstName: string;
  lastName: string;
  branchName: string;
  plannedWeeklyHours: number;
  coefficientWeightedHours: number;
  contractualWeeklyHours: number;
  utilizationPercent: number;
  status: 'underloaded' | 'balanced' | 'overloaded';
  classCount: number;
  subjectCount: number;
  splitClassCount: number;
}

export interface TeacherWorkloadDetail extends TeacherWorkload {
  loads: TeachingLoad[];
}
