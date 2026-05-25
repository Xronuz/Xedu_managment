import { apiClient } from './client';
import type { DayOfWeek } from '@eduplatform/types';

export const scheduleApi = {
  getToday: async (params?: { weekType?: string; includeDrafts?: boolean; includeArchived?: boolean }) => {
    const { data } = await apiClient.get('/schedule/today', { params });
    return data;
  },

  getWeek: async (params?: { classId?: string; weekType?: string; includeDrafts?: boolean; includeArchived?: boolean }) => {
    const { data } = await apiClient.get('/schedule/week', { params });
    return data;
  },

  getByClass: async (classId: string, params?: { weekType?: string; includeDrafts?: boolean; includeArchived?: boolean }) => {
    const { data } = await apiClient.get(`/schedule/class/${classId}`, { params });
    return data;
  },

  getTeacherCrossBranch: async (teacherId: string, viewerBranchId?: string, weekType?: string) => {
    const { data } = await apiClient.get(`/schedule/teacher/${teacherId}/cross-branch`, {
      params: { viewerBranchId, weekType },
    });
    return data;
  },

  create: async (payload: {
    classId: string;
    subjectId: string;
    teacherId?: string;
    roomNumber?: string;
    roomId?: string;
    dayOfWeek: DayOfWeek;
    timeSlot: number;
    startTime: string;
    endTime: string;
    weekType?: string;
  }) => {
    const { data } = await apiClient.post('/schedule', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    roomNumber: string;
    roomId: string;
    startTime: string;
    endTime: string;
    dayOfWeek: DayOfWeek;
    timeSlot: number;
    weekType?: string;
  }>) => {
    const { data } = await apiClient.put(`/schedule/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/schedule/${id}`);
    return data;
  },

  validate: async (id: string) => {
    const { data } = await apiClient.post(`/schedule/${id}/validate`);
    return data;
  },

  publish: async (id: string) => {
    const { data } = await apiClient.post(`/schedule/${id}/publish`);
    return data;
  },

  unpublish: async (id: string) => {
    const { data } = await apiClient.post(`/schedule/${id}/unpublish`);
    return data;
  },

  archive: async (id: string) => {
    const { data } = await apiClient.post(`/schedule/${id}/archive`);
    return data;
  },

  bulkPublish: async (ids: string[]) => {
    const { data } = await apiClient.post('/schedule/bulk-publish', { ids });
    return data;
  },

  getCurrentWeekType: async () => {
    const { data } = await apiClient.get('/schedule/week-type/current');
    return data as { weekType: string; isoWeekNumber: number };
  },

  checkConflict: async (params: {
    dayOfWeek: string;
    timeSlot: number;
    teacherId?: string;
    roomNumber?: string;
    roomId?: string;
    classId?: string;
    excludeId?: string;
    branchId?: string;
    weekType?: string;
  }): Promise<{ hasConflict: boolean; conflicts: { type: string; message: string }[] }> => {
    const { data } = await apiClient.get('/schedule/check-conflict', { params });
    return data;
  },
};
