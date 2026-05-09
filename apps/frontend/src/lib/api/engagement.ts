import { apiClient } from './client';

export interface EngagementConfig {
  engagement_enabled: boolean;
  engagement_positive: boolean;
  engagement_accountability: boolean;
  engagement_achievements: boolean;
  engagement_streaks: boolean;
  engagement_leaderboard: boolean;
  engagement_shop: boolean;
  engagement_teacher_award: boolean;
  engagement_teacher_deduct: boolean;
  engagement_recovery_enabled: boolean;
  engagement_leaderboard_visible: boolean;
  engagement_public_deductions: boolean;
  engagement_monthly_exam: boolean;
  coin_rules_positive: Record<string, number>;
  coin_rules_accountability: Record<string, number>;
  coin_thresholds: Record<string, number>;
  engagement_recovery_rate: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  category: string;
  criteria: Record<string, unknown>;
  rewardCoins: number;
  isActive: boolean;
  isPositive: boolean;
  progress?: { current: number; target: number };
  unlockedAt?: string | null;
  isUnlocked?: boolean;
}

export interface RecoveryPath {
  action: string;
  description: string;
  reward: number;
  completed: boolean;
}

export const engagementApi = {
  // Config
  getConfig: () => apiClient.get('/engagement/config').then(r => r.data as EngagementConfig),
  updateConfig: (payload: Partial<EngagementConfig>) =>
    apiClient.patch('/engagement/config', payload).then(r => r.data as EngagementConfig),

  // Achievements
  getAchievements: (studentId?: string) =>
    apiClient.get('/engagement/achievements', { params: { studentId } }).then(r => r.data as Achievement[]),
  seedAchievements: () =>
    apiClient.post('/engagement/achievements/seed').then(r => r.data),

  // Recovery
  getRecoveryPath: (studentId?: string) =>
    apiClient.get('/engagement/recovery', { params: { studentId } }).then(r => r.data as RecoveryPath[]),
  applyRecovery: (studentId: string, reason: string) =>
    apiClient.post(`/engagement/recovery/${studentId}`, { reason }).then(r => r.data),

  // Analytics
  getClassParticipation: (classId?: string) =>
    apiClient.get('/engagement/analytics/class-participation', { params: { classId } }).then(r => r.data),
  getRewardDistribution: (days?: number) =>
    apiClient.get('/engagement/analytics/reward-distribution', { params: { days } }).then(r => r.data),
  getAccountabilityDistribution: (days?: number) =>
    apiClient.get('/engagement/analytics/accountability-distribution', { params: { days } }).then(r => r.data),
  getEngagementTrend: (days?: number) =>
    apiClient.get('/engagement/analytics/trend', { params: { days } }).then(r => r.data),
  getExamCorrelation: (days?: number) =>
    apiClient.get('/engagement/analytics/exam-correlation', { params: { days } }).then(r => r.data),
};
