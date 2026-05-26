import { apiClient } from './client';

export interface AnalyzeRepairInput {
  scheduleId?: string;
  leaveRequestId?: string;
  roomId?: string;
  date?: string;
  reason?: string;
}

export interface RepairOption {
  id: string;
  type: 'substitute_teacher' | 'room_swap' | 'reschedule_lesson' | 'teacher_swap';
  score: number;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  explanation: string;
  requiredActions: string[];
  payload: Record<string, any>;
}

export interface AffectedSchedule {
  scheduleId: string;
  date: string;
  dayOfWeek: string;
  timeSlot: number;
  subjectName: string;
  className: string;
  roomName?: string;
  teacherName: string;
}

export interface AnalyzeRepairResult {
  disruption: {
    type: string;
    description: string;
    affectedTeacherId?: string;
    affectedRoomId?: string;
    affectedDate?: string;
  };
  affectedSchedules: AffectedSchedule[];
  options: RepairOption[];
}

export interface ApplyRepairInput {
  optionId: string;
  type: 'substitute_teacher' | 'room_swap' | 'reschedule_lesson' | 'teacher_swap';
  scheduleId: string;
  date: string;
  substituteTeacherId?: string;
  newRoomId?: string;
  newDayOfWeek?: string;
  newTimeSlot?: number;
  swapTeacherId?: string;
  swapScheduleId?: string;
}

export const scheduleRepairApi = {
  analyze: async (input: AnalyzeRepairInput) => {
    const { data } = await apiClient.post<AnalyzeRepairResult>('/schedule/repair/analyze', input);
    return data;
  },

  apply: async (input: ApplyRepairInput) => {
    const { data } = await apiClient.post<{ applied: boolean; type: string; substitutionId?: string; message: string }>('/schedule/repair/apply', input);
    return data;
  },
};
