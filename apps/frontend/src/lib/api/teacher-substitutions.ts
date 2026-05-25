import { apiClient } from './client';

export interface AffectedSlot {
  scheduleId: string;
  date: string;
  dayOfWeek: string;
  timeSlot: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  roomName: string | null;
  branchName: string;
  weekType: string;
  existingSubstitutionId?: string;
  existingSubstitutionStatus?: string;
}

export interface CandidateTeacher {
  teacherId: string;
  firstName: string;
  lastName: string;
  score: number;
  reasons: string[];
}

export interface SubstitutionItem {
  id: string;
  date: string;
  status: string;
  originalTeacher: { id: string; firstName: string; lastName: string };
  substituteTeacher: { id: string; firstName: string; lastName: string };
  schedule: {
    dayOfWeek: string;
    timeSlot: number;
    startTime: string;
    endTime: string;
    subject: { name: string };
    class: { name: string };
  };
  branch: { id: string; name: string };
  approvedBy?: { id: string; firstName: string; lastName: string };
  leaveRequest?: { id: string; type: string };
}

export const teacherSubstitutionsApi = {
  getAffected: async (leaveRequestId: string): Promise<{
    leaveRequestId: string;
    teacherId: string;
    teacherName: string;
    startDate: string;
    endDate: string;
    affectedCount: number;
    affectedSlots: AffectedSlot[];
  }> => {
    const { data } = await apiClient.get('/teacher-attendance/substitutions/affected', { params: { leaveRequestId } });
    return data;
  },

  getCandidates: async (scheduleId: string, date: string): Promise<CandidateTeacher[]> => {
    const { data } = await apiClient.get('/teacher-attendance/substitutions/candidates', { params: { scheduleId, date } });
    return data;
  },

  propose: async (payload: {
    leaveRequestId: string;
    selections: Array<{ scheduleId: string; date: string; substituteTeacherId: string; reason?: string }>;
  }) => {
    const { data } = await apiClient.post('/teacher-attendance/substitutions/propose', payload);
    return data;
  },

  approve: async (id: string) => {
    const { data } = await apiClient.post(`/teacher-attendance/substitutions/${id}/approve`);
    return data;
  },

  reject: async (id: string, reason?: string) => {
    const { data } = await apiClient.post(`/teacher-attendance/substitutions/${id}/reject`, { reason });
    return data;
  },

  apply: async (id: string) => {
    const { data } = await apiClient.post(`/teacher-attendance/substitutions/${id}/apply`);
    return data;
  },

  cancel: async (id: string, reason?: string) => {
    const { data } = await apiClient.post(`/teacher-attendance/substitutions/${id}/cancel`, { reason });
    return data;
  },

  list: async (params?: {
    status?: string;
    teacherId?: string;
    date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: SubstitutionItem[]; total: number; limit: number; offset: number }> => {
    const { data } = await apiClient.get('/teacher-attendance/substitutions/list', { params });
    return data;
  },

  getOne: async (id: string): Promise<SubstitutionItem & {
    leaveRequest?: { id: string; type: string; startDate: string; endDate: string };
    attendances?: Array<{ teacherId: string; status: string }>;
  }> => {
    const { data } = await apiClient.get(`/teacher-attendance/substitutions/detail/${id}`);
    return data;
  },
};
