import { apiClient } from './client';

export interface SystemConfigMap {
  bhm: number;
  academic_year: string;
  school_name: string;
  school_phone: string;
  school_address: string;
  pass_threshold: number;
  work_days: number;
}

export interface OnboardingStatus {
  onboardingStep: number;
  onboardingCompleted: boolean;
}

export const systemConfigApi = {
  getAll: (): Promise<SystemConfigMap> =>
    apiClient.get('/system-config').then(r => r.data),

  update: (payload: Partial<SystemConfigMap>): Promise<SystemConfigMap> =>
    apiClient.patch('/system-config', payload).then(r => r.data),

  getOnboardingStatus: (): Promise<OnboardingStatus> =>
    apiClient.get('/system-config/onboarding').then(r => r.data),

  updateOnboardingStatus: (payload: Partial<OnboardingStatus>): Promise<{ success: boolean }> =>
    apiClient.patch('/system-config/onboarding', payload).then(r => r.data),
};
