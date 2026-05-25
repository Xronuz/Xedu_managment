import { apiClient } from './client';

export interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  classId?: string;
  branchId?: string;
}

export interface UpdateStudentPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface LinkParentPayload {
  parentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
}

export const studentsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get('/students', { params });
    return data;
  },

  getOne: async (id: string) => {
    const { data } = await apiClient.get(`/students/${id}`);
    return data;
  },

  create: async (payload: CreateStudentPayload) => {
    const { data } = await apiClient.post('/students', payload);
    return data;
  },

  update: async (id: string, payload: UpdateStudentPayload) => {
    const { data } = await apiClient.patch(`/students/${id}`, payload);
    return data;
  },

  linkParent: async (studentId: string, payload: LinkParentPayload) => {
    const { data } = await apiClient.post(`/students/${studentId}/parents/link`, payload);
    return data;
  },
};
