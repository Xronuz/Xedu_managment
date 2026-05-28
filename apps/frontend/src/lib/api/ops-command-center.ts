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
  category: 'schedule' | 'staff' | 'payroll' | 'setup' | 'finance';
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  link?: string;
  createdAt: string;
  /** Who must act on this alert */
  owner: 'director' | 'vice_principal' | 'branch_admin' | 'accountant';
  /** CTA label shown to the owner */
  actionCta: string;
  /** Frontend route to resolve */
  route: string;
  /** Resolution state: open | in_progress | resolved */
  resolutionState: 'open' | 'in_progress' | 'resolved';
}

export interface ReadinessItem {
  id: string;
  label: string;
  category: string;
  weight: number;
  completed: boolean;
  required: boolean;
  link?: string;
  primaryOwner: string;
  secondaryOwner?: string;
  visibilityScope: string[];
}

export interface ReadinessScoreResponse {
  score: number;
  status: 'not_started' | 'in_progress' | 'ready' | 'operational';
  checklist: ReadinessItem[];
}

export interface RoleReadinessResponse {
  myActions: ReadinessItem[];
  delegatedActions: ReadinessItem[];
  informationalBlockers: ReadinessItem[];
  score: number;
  status: 'not_started' | 'in_progress' | 'ready' | 'operational';
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

  getRoleReadiness: async (schoolId: string) => {
    const { data } = await apiClient.get<RoleReadinessResponse>(`/schools/${schoolId}/readiness/role`);
    return data;
  },
};
