import { apiClient } from './client';

/**
 * O'quvchi (student) self-service API.
 * Grades/attendance endpointlari o'z `studentId` (= user.id) bilan chaqiriladi;
 * schedule/coins/homework esa CurrentUser bo'yicha o'zini qaytaradi.
 */
export const studentApi = {
  scheduleToday: () => apiClient.get('/schedule/today').then((r) => r.data),

  grades: (studentId: string) =>
    apiClient.get(`/grades/student/${studentId}`).then((r) => r.data),

  attendance: (studentId: string) =>
    apiClient.get(`/attendance/student/${studentId}/history`, { params: { limit: 30 } }).then((r) => r.data),

  coinsBalance: () => apiClient.get('/coins/balance').then((r) => r.data),

  coinsHistory: () => apiClient.get('/coins/history', { params: { limit: 30 } }).then((r) => r.data),

  homework: () => apiClient.get('/homework').then((r) => r.data),

  submitHomework: (homeworkId: string, content: string) =>
    apiClient.post(`/homework/${homeworkId}/submit`, { content }).then((r) => r.data),
};
