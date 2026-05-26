import { apiClient } from './client';

export interface SubjectCatalogItem {
  name: string;
  normalizedName: string;
  count: number;
  classes: { id: string; name: string }[];
  teachers: { id: string; firstName: string; lastName: string }[];
  subjectIds: string[];
  totalHoursPerWeek: number;
}

export const subjectsApi = {
  /** Barcha fanlar — admin/vice_principal */
  getAll: (classId?: string, branchId?: string) =>
    apiClient.get('/subjects', { params: { ...(classId ? { classId } : {}), ...(branchId ? { branchId } : {}) } }).then(r => r.data),

  /** Fanlar katalogi — takrorlanishlarsiz, sinf qamrovi bilan */
  getCatalog: (branchId?: string) =>
    apiClient.get<SubjectCatalogItem[]>('/subjects/catalog', { params: branchId ? { branchId } : undefined }).then(r => r.data),

  /** Faqat menga biriktirilgan fanlar — teacher/class_teacher */
  getMine: () =>
    apiClient.get('/subjects/mine').then(r => r.data),

  create: (payload: { name: string; classIds?: string[]; teacherId?: string; code?: string }) =>
    apiClient.post('/subjects', payload).then(r => r.data),

  update: (id: string, payload: Partial<{ name: string; classIds: string[]; teacherId: string; code: string }>) =>
    apiClient.put(`/subjects/${id}`, payload).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/subjects/${id}`).then(r => r.data),
};
