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
    financeType?: string;
    timezone?: string;
    directorFirstName?: string;
    directorLastName?: string;
    directorEmail?: string;
  }) => {
    const { data } = await apiClient.post('/super-admin/schools', payload);
    return data as {
      id: string;
      name: string;
      mainBranchId: string;
      director: { id: string; email: string; temporaryPassword: string } | null;
    };
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

  hardDeleteSchool: async (id: string) => {
    const { data } = await apiClient.delete(`/super-admin/schools/${id}/permanent`);
    return data as { message: string; schoolId: string };
  },

  suspendSchool: async (id: string) => {
    const { data } = await apiClient.post(`/super-admin/schools/${id}/suspend`);
    return data as { message: string; schoolId: string };
  },

  reactivateSchool: async (id: string) => {
    const { data } = await apiClient.post(`/super-admin/schools/${id}/reactivate`);
    return data as { message: string; schoolId: string };
  },

  updateSubscription: async (
    schoolId: string,
    payload: {
      plan?: string;
      status?: string;
      billingCycle?: string;
      nextBilling?: string;
      trialEndsAt?: string;
    },
  ) => {
    const { data } = await apiClient.patch(`/super-admin/schools/${schoolId}/subscription`, payload);
    return data;
  },

  impersonate: async (schoolId: string, userId: string) => {
    const { data } = await apiClient.post(`/super-admin/schools/${schoolId}/impersonate`, { userId });
    return data as {
      user: {
        id: string; email: string; firstName: string; lastName: string;
        role: string; schoolId: string; branchId: string | null; isFirstLogin: boolean;
      };
      tokens: { accessToken: string; refreshToken: string; expiresIn: number };
      impersonation: { schoolId: string; schoolName: string; expiresAt: string };
    };
  },

  broadcast: async (payload: { title: string; body: string; schoolId?: string; priority?: string }) => {
    const { data } = await apiClient.post('/super-admin/broadcast', payload);
    return data as { sent: number; skipped: number; message: string };
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
