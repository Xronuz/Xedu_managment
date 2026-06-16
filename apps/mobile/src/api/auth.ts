import type { TokenPair } from '@eduplatform/types';
import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: string | null;
  branchId: string | null;
  isFirstLogin?: boolean;
  avatarUrl?: string | null;
  assignedBranchIds?: string[];
}

export interface LoginResult {
  user: AuthUser;
  tokens: TokenPair;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient
      .post<LoginResult>('/auth/login', { email, password })
      .then((r) => r.data),

  /** Birinchi kirishda majburiy parol almashtirish — yangi tokenlar qaytadi. */
  firstLogin: (currentPassword: string, newPassword: string) =>
    apiClient
      .post<{ message: string; tokens: TokenPair }>('/auth/first-login', {
        currentPassword,
        newPassword,
      })
      .then((r) => r.data),

  logout: (refreshToken: string | null) =>
    apiClient
      .post('/auth/logout', refreshToken ? { refreshToken } : {})
      .then((r) => r.data)
      .catch(() => undefined),

  me: () => apiClient.get<AuthUser>('/users/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),
};
