import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/config/env';
import { tokenStore } from './token-store';

/**
 * Mobil axios klient.
 *
 * Web `apps/frontend/src/lib/api/client.ts` mantiqidan ko'chirilgan, farqlar:
 *  - Token manbasi: `tokenStore` (Keychain), zustand+cookie emas.
 *  - `withCredentials` YO'Q — mobilda httpOnly cookie ishlamaydi.
 *  - Refresh BODY orqali: `POST /auth/refresh { refreshToken }` (backend qo'llaydi).
 *  - 401 yakuniy muvaffaqiyatsizlikda `window.location` o'rniga
 *    `tokenStore.triggerAuthFailure()` -> Login ekraniga reset.
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

import { useBranchStore } from '@/store/branch.store';

// ── Request: Authorization header ────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.getAccess();
    config.headers = AxiosHeaders.from(config.headers);
    if (token && !config.headers.has('Authorization')) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    const branchId = useBranchStore.getState().activeBranchId;
    if (branchId && !config.headers.has('x-branch-id')) {
      config.headers.set('x-branch-id', branchId);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── 401 -> auto refresh (navbat + circuit breaker) ──────────────────────────
let isRefreshing = false;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

async function failHard(): Promise<void> {
  await tokenStore.clear();
  tokenStore.triggerAuthFailure();
}

// ── Response: envelope unwrap + 401 handling ────────────────────────────────
// Backend barcha javoblarni { success, data, timestamp, path } ga o'raydi.
apiClient.interceptors.response.use(
  (res) => {
    if (
      res.data &&
      typeof res.data === 'object' &&
      res.data.success === true &&
      'data' in res.data
    ) {
      res.data = res.data.data;
    }
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (original && error.response?.status === 401 && !original._retry) {
      const url = original.url ?? '';
      if (PUBLIC_AUTH_ENDPOINTS.has(url)) {
        return Promise.reject(error);
      }

      // Circuit breaker — 3 urinishdan keyin to'xtatish
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        processQueue(error, null);
        isRefreshing = false;
        refreshAttempts = 0;
        await failHard();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers = AxiosHeaders.from(original.headers);
          original.headers.set('Authorization', `Bearer ${token}`);
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;
      refreshAttempts += 1;

      try {
        const refreshToken = tokenStore.getRefresh();
        if (!refreshToken) throw new Error('Refresh token yo‘q');

        // Mobil: refresh BODY orqali (cookie emas). Yangi instansiya — interceptor halqasidan qochish.
        const { data: raw } = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );
        const data = raw && raw.success === true && 'data' in raw ? raw.data : raw;

        await tokenStore.setTokens(data.accessToken, data.refreshToken ?? refreshToken);
        refreshAttempts = 0;
        processQueue(null, data.accessToken);

        original.headers = AxiosHeaders.from(original.headers);
        original.headers.set('Authorization', `Bearer ${data.accessToken}`);
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await failHard();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
