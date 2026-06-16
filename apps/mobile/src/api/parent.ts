import { apiClient } from './client';

/**
 * Ota-ona (parent) API — backend `parent` moduli MVP uchun tayyor.
 * Endpointlar: apps/backend/src/modules/parent/parent.controller.ts
 */
export const parentApi = {
  getChildren: () => apiClient.get('/parent/children').then((r) => r.data),

  getChild: (id: string) => apiClient.get(`/parent/child/${id}`).then((r) => r.data),

  getChildAttendance: (id: string) =>
    apiClient.get(`/parent/child/${id}/attendance`).then((r) => r.data),

  getChildGrades: (id: string) =>
    apiClient.get(`/parent/child/${id}/grades`).then((r) => r.data),

  getChildSchedule: (id: string) =>
    apiClient.get(`/parent/child/${id}/schedule`).then((r) => r.data),

  getChildPayments: (id: string) =>
    apiClient.get(`/parent/child/${id}/payments`).then((r) => r.data),

  getChildCoins: (id: string) =>
    apiClient.get(`/parent/child/${id}/coins`).then((r) => r.data),

  getChildLeaveRequests: (id: string) =>
    apiClient.get(`/parent/child/${id}/leave-requests`).then((r) => r.data),

  createLeaveRequest: (
    studentId: string,
    payload: { startDate: string; endDate: string; reason: string; type?: string },
  ) =>
    apiClient.post(`/parent/child/${studentId}/leave-request`, payload).then((r) => r.data),

  getChildHomework: (studentId: string) =>
    apiClient.get(`/homework/by-child/${studentId}`).then((r) => r.data),
};
