import { apiClient } from './client';
import type { Page } from '@/lib/use-paginated';

export interface Person {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  avatarUrl?: string | null;
  isActive?: boolean;
}

export const studentsApi = {
  list: (page: number, search?: string) =>
    apiClient.get<Page<Person>>('/students', { params: { page, limit: 20, search } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Person>(`/students/${id}`).then((r) => r.data),
  create: (dto: { firstName: string; lastName: string; email: string; password: string; phone?: string; classId?: string }) =>
    apiClient.post('/students', dto).then((r) => r.data),
};

export const usersApi = {
  list: (page: number, search?: string, role?: string) =>
    apiClient.get<Page<Person>>('/users', { params: { page, limit: 20, search, role } }).then((r) => r.data),
};

export interface ClassItem {
  id: string;
  name: string;
  gradeLevel?: number;
  studentCount?: number;
  _count?: { students?: number };
}

export const classesApi = {
  list: () => apiClient.get<ClassItem[]>('/classes').then((r) => r.data),
  get: (id: string) => apiClient.get(`/classes/${id}`).then((r) => r.data),
  students: (id: string) => apiClient.get<Person[]>(`/classes/${id}/students`).then((r) => r.data),
  create: (dto: { name: string; gradeLevel: number; branchId: string; teacherId?: string }) =>
    apiClient.post('/classes', dto).then((r) => r.data),
};

export interface SubjectItem {
  id: string;
  name: string;
  teacher?: { firstName?: string; lastName?: string } | null;
}

export const subjectsApi = {
  list: (classId?: string) => apiClient.get<SubjectItem[]>('/subjects', { params: classId ? { classId } : {} }).then((r) => r.data),
  create: (dto: { name: string; classId?: string; teacherId?: string }) =>
    apiClient.post('/subjects', dto).then((r) => r.data),
};
