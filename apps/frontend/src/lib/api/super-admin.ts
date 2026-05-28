import { apiClient } from './client';

export const superAdminApi = {
  getStats: async () => {
    const { data } = await apiClient.get('/super-admin/stats');
    return data;
  },

  getSchools: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get('/super-admin/schools', { params });
    return data;
  },

  getSchool: async (id: string) => {
    const { data } = await apiClient.get(`/super-admin/schools/${id}`);
    return data;
  },

  createSchool: async (payload: {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    email?: string;
    subscriptionTier?: string;
  }) => {
    const { data } = await apiClient.post('/super-admin/schools', payload);
    return data;
  },

  updateSchool: async (id: string, payload: object) => {
    const { data } = await apiClient.put(`/super-admin/schools/${id}`, payload);
    return data;
  },

  getModules: async (schoolId: string) => {
    const { data } = await apiClient.get(`/super-admin/schools/${schoolId}/modules`);
    return data;
  },

  toggleModule: async (schoolId: string, moduleName: string, isEnabled: boolean) => {
    const { data } = await apiClient.post(`/super-admin/schools/${schoolId}/modules/toggle`, {
      moduleName,
      isEnabled,
    });
    return data;
  },

  deleteSchool: async (id: string) => {
    const { data } = await apiClient.delete(`/super-admin/schools/${id}`);
    return data as { message: string; schoolId: string };
  },

  getSchoolUsers: async (schoolId: string, role?: string) => {
    const { data } = await apiClient.get(`/super-admin/schools/${schoolId}/users`, { params: { role } });
    return data as Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      role: string;
      isActive: boolean;
      createdAt: string;
    }>;
  },
};

export type DemoRequestStatus = 'new' | 'contacted' | 'scheduled' | 'completed' | 'rejected';

export interface DemoRequest {
  id: string;
  firstName: string;
  lastName: string;
  institution: string;
  email: string;
  phone: string;
  status: DemoRequestStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const demoRequestsApi = {
  submit: async (payload: {
    firstName: string; lastName: string;
    institution: string; email: string; phone: string;
  }) => {
    const { data } = await apiClient.post('/demo-requests', payload);
    return data as { success: boolean; data: DemoRequest };
  },

  getAll: async (params?: { page?: number; limit?: number; status?: DemoRequestStatus }) => {
    const { data } = await apiClient.get('/demo-requests', { params });
    return data as { success: boolean; data: DemoRequest[]; meta: { total: number; page: number; limit: number; pages: number } };
  },

  getStats: async () => {
    const { data } = await apiClient.get('/demo-requests/stats');
    return data as { success: boolean; data: Record<DemoRequestStatus, number> };
  },

  update: async (id: string, payload: { status?: DemoRequestStatus; notes?: string }) => {
    const { data } = await apiClient.patch(`/demo-requests/${id}`, payload);
    return data as { success: boolean; data: DemoRequest };
  },
};
