import { apiClient } from './client';

export interface ProposedSlot {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  dayOfWeek: string;
  timeSlot: number;
  startTime: string;
  endTime: string;
}

export interface PlacementFailure {
  demand: {
    id: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    hoursPerWeek: number;
  };
  attemptedSlots: Array<{
    dayOfWeek: string;
    timeSlot: number;
    roomId?: string;
    reason: string;
  }>;
  finalReason: string;
  message: string;
}

export interface GeneratorConflictReport {
  totalDemands: number;
  placed: number;
  failed: number;
  proposedSlots: ProposedSlot[];
  failures: PlacementFailure[];
  stats: {
    byReason: Record<string, number>;
    byTeacher: Record<string, number>;
    byClass: Record<string, number>;
    bySubject: Record<string, number>;
  };
}

export interface GenerateScheduleDto {
  branchId?: string;
  daysOfWeek?: string[];
  classIds?: string[];
  subjectIds?: string[];
  strategy?: 'greedy';
  overwriteExisting?: boolean;
  timeoutMs?: number;
  weekType?: string;
}

export interface AdvancedGenerateScheduleDto {
  branchId?: string;
  daysOfWeek?: string[];
  classIds?: string[];
  subjectIds?: string[];
  strategy?: 'greedy' | 'hybrid';
  overwriteExisting?: boolean;
  weekType?: string;
  timeoutMs?: number;
  maxDepth?: number;
}

export type SolverRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface SolverRun {
  id: string;
  schoolId: string;
  branchId: string | null;
  weekType: string;
  strategy: string;
  status: SolverRunStatus;
  demandsCount: number;
  placedCount: number;
  failureCount: number;
  score: number | null;
  metadata: Record<string, any> | null;
  createdById: string;
  createdAt: string;
  completedAt: string | null;
}

export const scheduleGeneratorApi = {
  generate: async (dto: GenerateScheduleDto): Promise<GeneratorConflictReport> => {
    const { data } = await apiClient.post('/schedule/generate', dto);
    return data;
  },

  advancedGenerate: async (dto: AdvancedGenerateScheduleDto): Promise<SolverRun> => {
    const { data } = await apiClient.post('/schedule/advanced-generate', dto);
    return data;
  },

  getSolverRun: async (id: string): Promise<SolverRun> => {
    const { data } = await apiClient.get(`/schedule/solver-runs/${id}`);
    return data;
  },

  listSolverRuns: async (params?: { branchId?: string; limit?: number; offset?: number }): Promise<{ runs: SolverRun[]; total: number; limit: number; offset: number }> => {
    const { data } = await apiClient.get('/schedule/solver-runs', { params });
    return data;
  },

  commit: async (slots: ProposedSlot[], overwriteExisting?: boolean): Promise<{ created: number; errors: string[] }> => {
    const { data } = await apiClient.post('/schedule/generate/commit', { slots, overwriteExisting });
    return data;
  },
};
