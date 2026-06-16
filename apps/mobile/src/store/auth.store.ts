import { create } from 'zustand';
import type { TokenPair } from '@eduplatform/types';
import { secureStorage, STORAGE_KEYS } from '@/lib/secure-storage';
import { tokenStore } from '@/api/token-store';
import { authApi, type AuthUser } from '@/api/auth';
import { unregisterForPush } from '@/push/push';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hydrated: boolean;

  /** Ilova ishga tushganda Keychain'dan sessiyani tiklash. */
  bootstrap: () => Promise<void>;
  setSession: (user: AuthUser, tokens: TokenPair) => Promise<void>;
  setUser: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  hydrated: false,

  bootstrap: async () => {
    const { accessToken } = await tokenStore.hydrate();
    const rawUser = await secureStorage.get(STORAGE_KEYS.user);
    const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null;

    if (accessToken && user) {
      set({ user, isAuthenticated: true, hydrated: true });
    } else {
      set({ user: null, isAuthenticated: false, hydrated: true });
    }
  },

  setSession: async (user, tokens) => {
    await tokenStore.setTokens(tokens.accessToken, tokens.refreshToken);
    await secureStorage.set(STORAGE_KEYS.user, JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  setUser: async (user) => {
    await secureStorage.set(STORAGE_KEYS.user, JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    const refreshToken = tokenStore.getRefresh();
    // Push tokenni o'chiramiz (access token hali yaroqli — clear'dan oldin)
    await unregisterForPush();
    await authApi.logout(refreshToken);
    await tokenStore.clear();
    await secureStorage.remove(STORAGE_KEYS.user);
    set({ user: null, isAuthenticated: false });
  },
}));
