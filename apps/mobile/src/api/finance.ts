import { apiClient } from './client';
import type { Page } from '@/lib/use-paginated';

export interface Payment {
  id: string;
  amount: number;
  currency?: string;
  status: string;
  description?: string | null;
  dueDate?: string | null;
  createdAt: string;
  student?: { firstName?: string; lastName?: string } | null;
}

export const paymentsApi = {
  history: (page: number, status?: string) =>
    apiClient.get<Page<Payment>>('/payments/history', { params: { page, limit: 20, status } }).then((r) => r.data),
  create: (dto: { studentId: string; amount: number; description?: string; dueDate?: string }) =>
    apiClient.post('/payments', dto).then((r) => r.data),
  markPaid: (id: string) => apiClient.put(`/payments/${id}/paid`).then((r) => r.data),
};

export interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  frequency?: string | null;
}

export const feeApi = {
  list: () => apiClient.get<FeeStructure[]>('/fee-structures').then((r) => r.data),
  create: (dto: { name: string; amount: number; frequency?: string }) =>
    apiClient.post('/fee-structures', dto).then((r) => r.data),
};

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  source?: string;
}

export const leadsApi = {
  list: (page: number, status?: string) =>
    apiClient.get<Page<Lead>>('/leads', { params: { page, limit: 20, status } }).then((r) => r.data),
  create: (dto: { firstName: string; lastName: string; phone: string; source: string }) =>
    apiClient.post('/leads', dto).then((r) => r.data),
};

export interface SalaryConfig {
  id: string;
  baseSalary: number;
  user?: { firstName?: string; lastName?: string; role?: string; avatarUrl?: string | null } | null;
}

export const payrollApi = {
  staff: () => apiClient.get<SalaryConfig[]>('/payroll/staff').then((r) => r.data),
};
