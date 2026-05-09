import { apiClient } from './client';

export interface AiStatus {
  provider: string;
  model: {
    name: string;
    provider: string;
    maxTokens: number;
    supportsStreaming: boolean;
    supportsStructured: boolean;
  };
  timestamp: string;
}

export interface AiUsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  byFeature: Array<{
    feature: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  byProvider: Array<{
    provider: string;
    requests: number;
  }>;
}

export interface AiEntitlement {
  userId: string;
  tier: string;
  features: Record<string, boolean>;
  expiresAt: string | null;
}

export const aiApi = {
  // Status
  getStatus: () => apiClient.get('/ai/status').then(r => r.data as AiStatus),

  // Usage
  getUsageSummary: (days = 30) =>
    apiClient.get('/ai/usage/summary', { params: { days } }).then(r => r.data as AiUsageSummary),
  getMyUsage: (days = 30) =>
    apiClient.get('/ai/usage/me', { params: { days } }).then(r => r.data),

  // Quota
  checkQuota: (feature: string) =>
    apiClient.get('/ai/quota', { params: { feature } }).then(r => r.data as { allowed: boolean; remaining: number; limit: number; used: number }),

  // Entitlement
  getMyEntitlement: () =>
    apiClient.get('/ai/entitlement').then(r => r.data as AiEntitlement),

  // Demo
  demoGenerate: (prompt: string, feature?: string) =>
    apiClient.post('/ai/demo/generate', { prompt, feature }).then(r => r.data),
};
