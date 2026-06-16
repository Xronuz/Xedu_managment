import * as SecureStore from 'expo-secure-store';

/**
 * Token saqlash uchun xavfsiz qatlam (iOS Keychain / Android Keystore).
 * Web platformasida SecureStore yo'q — localStorage fallback ishlatamiz.
 */
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* noop */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async remove(key: string): Promise<void> {
    if (isWeb) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* noop */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const STORAGE_KEYS = {
  accessToken: 'xedu.accessToken',
  refreshToken: 'xedu.refreshToken',
  user: 'xedu.user',
  language: 'xedu.language',
  theme: 'xedu.theme',
} as const;
