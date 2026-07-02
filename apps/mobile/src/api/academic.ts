import { apiClient } from './client';

export interface DisciplineIncident {
  id: string;
  type?: string;
  severity?: string;
  action?: string;
  description: string;
  date: string;
  student?: { firstName?: string; lastName?: string } | null;
}

export const disciplineApi = {
  list: () => apiClient.get<DisciplineIncident[]>('/discipline').then((r) => r.data),
  create: (dto: { studentId: string; description: string; date: string; type?: string; severity?: string; action?: string }) =>
    apiClient.post('/discipline', dto).then((r) => r.data),
};

export interface TeachingLoad {
  id: string;
  hoursPerWeek?: number;
  status?: string;
  teacher?: { firstName?: string; lastName?: string } | null;
  subject?: { name?: string } | null;
  class?: { name?: string } | null;
}

export const teachingLoadsApi = {
  list: () => apiClient.get<TeachingLoad[]>('/teaching-load').then((r) => r.data),
};

export const examAdminApi = {
  create: (dto: { classId: string; subjectId: string; title: string; frequency: string; maxScore: number; scheduledAt: string; duration?: number }) =>
    apiClient.post('/exams', dto).then((r) => r.data),
};

export interface HomeworkItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  class?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
}

export const homeworkApi = {
  list: () => apiClient.get<HomeworkItem[]>('/homework').then((r) => r.data),
  create: (dto: { classId: string; subjectId: string; title: string; description?: string; dueDate: string }) =>
    apiClient.post('/homework', dto).then((r) => r.data),
};

export interface Substitution {
  id: string;
  date: string;
  status: string;
  originalTeacher?: { firstName?: string; lastName?: string } | null;
  substituteTeacher?: { firstName?: string; lastName?: string } | null;
  schedule?: { startTime?: string; endTime?: string; subject?: { name?: string } | null; class?: { name?: string } | null } | null;
}

export const substitutionsApi = {
  list: () =>
    apiClient
      .get<{ items: Substitution[]; total: number }>('/teacher-attendance/substitutions/list', { params: { limit: 50 } })
      .then((r) => r.data.items),
};

export interface ShopItem {
  id: string;
  name: string;
  description?: string | null;
  cost: number;
  emoji?: string | null;
  stock?: number | null;
  isActive?: boolean;
}

export const shopAdminApi = {
  list: () => apiClient.get<ShopItem[]>('/coins/admin/shop').then((r) => r.data),
  create: (dto: { name: string; cost: number; description?: string; emoji?: string; stock?: number | null }) =>
    apiClient.post('/coins/admin/shop', dto).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/coins/admin/shop/${id}`).then((r) => r.data),
};
