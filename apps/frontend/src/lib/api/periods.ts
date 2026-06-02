import { apiClient } from './client';

export interface Period {
  id: string;
  schoolId: string;
  branchId: string;
  dayType: string | null;
  periodNumber: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePeriodPayload {
  periodNumber: number;
  startTime: string;
  endTime: string;
  dayType?: string;
  isActive?: boolean;
}

export interface UpdatePeriodPayload {
  startTime?: string;
  endTime?: string;
  dayType?: string;
  isActive?: boolean;
}

export const periodsApi = {
  getAll: async (branchId?: string): Promise<Period[]> => {
    const { data } = await apiClient.get('/periods', { params: { branchId } });
    return data;
  },

  getByBranch: async (branchId: string): Promise<Period[]> => {
    const { data } = await apiClient.get(`/periods/branch/${branchId}`);
    return data;
  },

  getOne: async (id: string): Promise<Period> => {
    const { data } = await apiClient.get(`/periods/${id}`);
    return data;
  },

  create: async (payload: CreatePeriodPayload): Promise<Period> => {
    const { data } = await apiClient.post('/periods', payload);
    return data;
  },

  update: async (id: string, payload: UpdatePeriodPayload): Promise<Period> => {
    const { data } = await apiClient.put(`/periods/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/periods/${id}`);
    return data;
  },
};
