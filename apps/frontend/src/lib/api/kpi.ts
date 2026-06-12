import { apiClient } from './client';

export type KpiSourceType = 'MANUAL' | 'SYSTEM';
export type KpiDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

export interface KpiMetric {
  id: string;
  name: string;
  description?: string;
  category: string;
  targetValue: number;
  unit: string;
  period: string;
  sourceType: KpiSourceType;
  sourceKey?: string | null;
  direction: KpiDirection;
  ownerId?: string | null;
  owner?: { id: string; firstName: string; lastName: string } | null;
  isActive: boolean;
  branchId?: string;
  branch?: { id: string; name: string };
  createdAt: string;
  _count?: { records: number };
}

export interface KpiCatalogItem {
  key: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  direction: KpiDirection;
  defaultTarget: number;
  alreadyAdded: boolean;
}

export interface KpiRecord {
  id: string;
  metricId: string;
  actualValue: number;
  periodStart: string;
  periodEnd: string;
  notes?: string;
  isAuto?: boolean;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface KpiDashboardItem {
  metricId: string;
  name: string;
  category: string;
  targetValue: number;
  unit: string;
  direction: KpiDirection;
  sourceType: KpiSourceType;
  sourceKey?: string | null;
  owner: { id: string; name: string } | null;
  awaitingValue: boolean;
  latestValue: number | null;
  latestPeriod: string | null;
  trend: number[];
  progress: number | null;
  status: 'good' | 'warn' | 'bad' | null;
}

export interface KpiDashboardResponse {
  metrics: KpiDashboardItem[];
  byCategory: Record<string, KpiDashboardItem[]>;
  overallScore: number | null;
}

export interface KpiBranchComparison {
  branches: { id: string; name: string }[];
  rows: {
    metricId: string;
    key: string | null;
    name: string;
    unit: string;
    direction: KpiDirection;
    targetValue: number;
    values: Record<string, number | null>;
  }[];
  periodStart: string;
  periodEnd: string;
}

export const kpiApi = {
  getMetrics: (category?: string) =>
    apiClient.get<KpiMetric[]>('/kpi/metrics', { params: { category } }).then(r => r.data),

  getMetric: (id: string) =>
    apiClient.get<KpiMetric & { records: KpiRecord[] }>(`/kpi/metrics/${id}`).then(r => r.data),

  createMetric: (payload: {
    name?: string;
    description?: string;
    category?: string;
    targetValue?: number;
    unit?: string;
    period?: string;
    branchId?: string | null;
    isActive?: boolean;
    sourceType?: KpiSourceType;
    sourceKey?: string;
    direction?: KpiDirection;
    ownerId?: string | null;
  }) => apiClient.post<KpiMetric>('/kpi/metrics', payload).then(r => r.data),

  getCatalog: () =>
    apiClient.get<KpiCatalogItem[]>('/kpi/catalog').then(r => r.data),

  runSnapshot: (period?: string) =>
    apiClient.post<{ written: number; skipped: number; total: number }>(
      '/kpi/snapshot/run',
      period ? { period } : {},
    ).then(r => r.data),

  updateMetric: (id: string, payload: Partial<KpiMetric>) =>
    apiClient.put<KpiMetric>(`/kpi/metrics/${id}`, payload).then(r => r.data),

  deleteMetric: (id: string) =>
    apiClient.delete(`/kpi/metrics/${id}`).then(r => r.data),

  createRecord: (payload: {
    metricId: string;
    actualValue: number;
    periodStart: string;
    periodEnd: string;
    notes?: string;
  }) => apiClient.post<KpiRecord>('/kpi/records', payload).then(r => r.data),

  getDashboard: () =>
    apiClient.get<KpiDashboardResponse>('/kpi/dashboard').then(r => r.data),

  getBranchComparison: (period?: string) =>
    apiClient.get<KpiBranchComparison>('/kpi/branch-comparison', { params: { period } }).then(r => r.data),
};
