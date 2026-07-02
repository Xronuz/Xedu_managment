import { apiClient } from './client';

// ── Insights / School Pulse (/reports/analytics/pulse) ──────────────────────
export interface SchoolPulse {
  totalStudents: number;
  totalTeachers: number;
  activeBranches: number;
  today: { present: number; absent: number; late: number; total: number; attendanceRate: number | null };
  monthlyRevenue: number;
  newLeadsThisWeek: number;
  pendingDebt: { amount: number; count: number };
  openAlerts: number;
}

export const insightsApi = {
  pulse: () => apiClient.get<SchoolPulse>('/reports/analytics/pulse').then((r) => r.data),
};

// ── KPI dashboard (/kpi/dashboard) ──────────────────────────────────────────
export type KpiStatus = 'good' | 'warn' | 'bad' | null;

export interface KpiMetricRow {
  metricId: string;
  name: string;
  category: string;
  targetValue: number | null;
  unit?: string | null;
  latestValue: number | null;
  trend: (number | null)[];
  progress: number | null;
  status: KpiStatus;
  awaitingValue: boolean;
}

export interface KpiDashboard {
  metrics: KpiMetricRow[];
  byCategory: Record<string, KpiMetricRow[]>;
  overallScore: number | null;
}

export const kpiDashboardApi = {
  get: () => apiClient.get<KpiDashboard>('/kpi/dashboard').then((r) => r.data),
};

// ── Ops today-summary (/ops/today-summary) ──────────────────────────────────
export interface OpsSummary {
  date: string;
  stats: { totalClassesToday: number; totalTeachersToday: number; periodsConfigured: boolean; roomsConfigured: boolean };
  schedule: { publishedSlots: number; draftSlots: number; conflicts: number };
  staff: { teachersPresent: number; teachersAbsent: number; teachersSubstituted: number; pendingLeaveRequests: number };
  substitutions: { pendingProposals: number; activeToday: number };
  payroll: { currentMonthStatus: string; missingAttendanceCount: number };
  alerts: { critical: number; warning: number; info: number };
}

export const opsApi = {
  summary: () => apiClient.get<OpsSummary>('/ops/today-summary').then((r) => r.data),
};
