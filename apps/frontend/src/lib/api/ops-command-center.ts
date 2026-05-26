import { apiClient } from './client';

export interface TodaySummaryResponse {
  date: string;
  schoolId: string;
  branchId?: string;
  stats: {
    totalClassesToday: number;
    totalTeachersToday: number;
    periodsConfigured: boolean;
    roomsConfigured: boolean;
  };
  schedule: {
    publishedSlots: number;
    draftSlots: number;
    conflicts: number;
  };
  staff: {
    teachersPresent: number;
    teachersAbsent: number;
    teachersSubstituted: number;
    pendingLeaveRequests: number;
  };
  substitutions: {
    pendingProposals: number;
    activeToday: number;
  };
  payroll: {
    currentMonthStatus: string;
    missingAttendanceCount: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface OpsAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'schedule' | 'staff' | 'payroll' | 'setup';
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  link?: string;
  createdAt: string;
}

export interface ReadinessItem {
  id: string;
  label: string;
  category: string;
  weight: number;
  completed: boolean;
  required: boolean;
  link?: string;
}

export interface ReadinessScoreResponse {
  score: number;
  status: 'not_started' | 'in_progress' | 'ready' | 'operational';
  checklist: ReadinessItem[];
}

export const opsCommandCenterApi = {
  getTodaySummary: async (branchId?: string) => {
    const { data } = await apiClient.get<TodaySummaryResponse>('/ops/today-summary', {
      params: branchId ? { branchId } : undefined,
    });
    return data;
  },

  getAlerts: async (branchId?: string) => {
    const { data } = await apiClient.get<OpsAlert[]>('/ops/alerts', {
      params: branchId ? { branchId } : undefined,
    });
    return data;
  },

  acknowledgeAlert: async (id: string, branchId?: string) => {
    const { data } = await apiClient.post<{ success: boolean }>(`/ops/alerts/${id}/acknowledge`, undefined, {
      params: branchId ? { branchId } : undefined,
    });
    return data;
  },

  getReadiness: async (schoolId: string) => {
    const { data } = await apiClient.get<ReadinessScoreResponse>(`/schools/${schoolId}/readiness`);
    return data;
  },

  recalculateReadiness: async (schoolId: string) => {
    const { data } = await apiClient.post<ReadinessScoreResponse>(`/schools/${schoolId}/readiness/recalculate`);
    return data;
  },
};
