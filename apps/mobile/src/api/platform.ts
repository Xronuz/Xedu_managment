import { apiClient } from './client';
import { SOCKET_URL } from '@/config/env';
import type { Page } from '@/lib/use-paginated';

export interface PlatformStats {
  schoolCount: number;
  userCount: number;
  activeSubscriptions: number;
}

export interface SchoolItem {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
  createdAt?: string;
  subscription?: { status?: string; plan?: string } | null;
  _count?: { users?: number; classes?: number };
}

export const platformApi = {
  stats: () => apiClient.get<PlatformStats>('/super-admin/stats').then((r) => r.data),

  schools: (page: number, search?: string): Promise<Page<SchoolItem>> =>
    apiClient
      .get<{ data: SchoolItem[]; meta: { total: number; page: number; limit: number } }>('/super-admin/schools', {
        params: { page, limit: 20, search },
      })
      .then((r) => {
        const m = r.data.meta;
        return { data: r.data.data, meta: { ...m, totalPages: Math.ceil(m.total / (m.limit || 20)) } };
      }),
};

export type DemoStatus = 'new' | 'contacted' | 'scheduled' | 'completed' | 'rejected';

export interface DemoRequest {
  id: string;
  firstName: string;
  lastName: string;
  institution: string;
  email: string;
  phone: string;
  status: DemoStatus;
  notes?: string | null;
  createdAt: string;
}

export const demoApi = {
  stats: () => apiClient.get<{ data: Record<string, number> }>('/demo-requests/stats').then((r) => r.data.data),

  list: (page: number, status?: DemoStatus): Promise<Page<DemoRequest>> =>
    apiClient
      .get<{ data: DemoRequest[]; meta: { total: number; page: number; limit: number; pages: number } }>('/demo-requests', {
        params: { page, limit: 20, status },
      })
      .then((r) => {
        const m = r.data.meta;
        return { data: r.data.data, meta: { total: m.total, page: m.page, limit: m.limit, totalPages: m.pages } };
      }),

  update: (id: string, dto: { status?: DemoStatus; notes?: string }) =>
    apiClient.patch(`/demo-requests/${id}`, dto).then((r) => r.data),
};

export interface HealthResult {
  status: 'ok' | 'error' | string;
  info?: Record<string, { status: string; message?: string }>;
  error?: Record<string, { status: string; message?: string }>;
  details?: Record<string, { status: string; message?: string }>;
}

export const healthApi = {
  // Health endpoint versiyasiz + public: `/api/health` (apiClient bazasi /api/v1 emas).
  check: () => apiClient.get<HealthResult>(`${SOCKET_URL}/api/health`).then((r) => r.data),
};
