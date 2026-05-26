import { apiClient } from './client';

export interface TeacherUtilization {
  teacherId: string;
  teacherName: string;
  scheduledSlots: number;
  contractualHours: number;
  utilizationPct: number;
  status: 'underloaded' | 'balanced' | 'overloaded';
  subjects: string[];
}

export interface RoomUtilization {
  roomId: string;
  roomName: string;
  capacity: number;
  occupiedSlots: number;
  totalSlots: number;
  utilizationPct: number;
}

export interface ScheduleDensity {
  dayOfWeek: string;
  timeSlot: number;
  scheduleCount: number;
  classCount: number;
  teacherCount: number;
}

export interface AbsenceSubstitutionAnalytics {
  totalAttendanceRecords: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  substitutedCount: number;
  absenceRatePct: number;
  substitutionFillRatePct: number;
  proposedCount: number;
  approvedCount: number;
  appliedCount: number;
  weeklyTrend: Array<{
    weekStart: string;
    absences: number;
    substitutions: number;
  }>;
}

export interface SolverQualityMetrics {
  totalRuns: number;
  successRatePct: number;
  avgPlacementPct: number;
  avgDurationMs: number | null;
  bestScore: number | null;
  recentRuns: Array<{
    id: string;
    strategy: string;
    status: string;
    placedCount: number;
    demandsCount: number;
    score: number | null;
    createdAt: string;
  }>;
}

export interface PayrollVariance {
  teacherId: string;
  teacherName: string;
  scheduledHours: number;
  completedHours: number;
  varianceHours: number;
  variancePct: number;
  source: string | null;
  payrollStatus: string;
}

export interface TimetableOverview {
  teacherCount: number;
  avgTeacherUtilizationPct: number;
  roomCount: number;
  avgRoomUtilizationPct: number;
  totalPublishedSlots: number;
  totalClasses: number;
  absenceRatePct: number;
  substitutionFillRatePct: number;
  solverSuccessRatePct: number;
  payrollVarianceAvgPct: number;
}

export const timetableAnalyticsApi = {
  getOverview: async () => {
    const { data } = await apiClient.get<TimetableOverview>('/schedule/analytics/timetable/overview');
    return data;
  },

  getTeacherUtilization: async () => {
    const { data } = await apiClient.get<TeacherUtilization[]>('/schedule/analytics/timetable/teacher-utilization');
    return data;
  },

  getRoomUtilization: async () => {
    const { data } = await apiClient.get<RoomUtilization[]>('/schedule/analytics/timetable/room-utilization');
    return data;
  },

  getScheduleDensity: async () => {
    const { data } = await apiClient.get<ScheduleDensity[]>('/schedule/analytics/timetable/schedule-density');
    return data;
  },

  getAbsenceSubstitution: async () => {
    const { data } = await apiClient.get<AbsenceSubstitutionAnalytics>('/schedule/analytics/timetable/absence-substitution');
    return data;
  },

  getSolverQuality: async () => {
    const { data } = await apiClient.get<SolverQualityMetrics>('/schedule/analytics/timetable/solver-quality');
    return data;
  },

  getPayrollVariance: async () => {
    const { data } = await apiClient.get<PayrollVariance[]>('/schedule/analytics/timetable/payroll-variance');
    return data;
  },
};
