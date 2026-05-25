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
}

export const scheduleGeneratorApi = {
  generate: async (dto: GenerateScheduleDto): Promise<GeneratorConflictReport> => {
    const { data } = await apiClient.post('/schedule/generate', dto);
    return data;
  },

  commit: async (slots: ProposedSlot[], overwriteExisting?: boolean): Promise<{ created: number; errors: string[] }> => {
    const { data } = await apiClient.post('/schedule/generate/commit', { slots, overwriteExisting });
    return data;
  },
};
