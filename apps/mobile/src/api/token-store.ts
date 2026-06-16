import { secureStorage, STORAGE_KEYS } from '@/lib/secure-storage';

/**
 * Tokenlar uchun modul darajasidagi saqlovchi.
 *
 * Maqsad: axios klient (`client.ts`) tokenni sinxron o'qiy oladi, lekin zustand
 * store (`auth.store.ts`) bilan aylanma bog'liqlik (circular import) bo'lmaydi.
 * Persistensiya — `expo-secure-store` (Keychain/Keystore).
 */
let accessToken: string | null = null;
let refreshToken: string | null = null;

/** 401 + refresh ham muvaffaqiyatsiz bo'lganda chaqiriladi (Login'ga reset). */
let onAuthFailure: (() => void) | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,

  async setTokens(access: string | null, refresh?: string | null): Promise<void> {
    accessToken = access;
    if (refresh !== undefined) refreshToken = refresh;

    if (access) await secureStorage.set(STORAGE_KEYS.accessToken, access);
    else await secureStorage.remove(STORAGE_KEYS.accessToken);

    if (refresh !== undefined) {
      if (refresh) await secureStorage.set(STORAGE_KEYS.refreshToken, refresh);
      else await secureStorage.remove(STORAGE_KEYS.refreshToken);
    }
  },

  async clear(): Promise<void> {
    accessToken = null;
    refreshToken = null;
    await secureStorage.remove(STORAGE_KEYS.accessToken);
    await secureStorage.remove(STORAGE_KEYS.refreshToken);
  },

  /** Ilova ishga tushganda Keychain'dan tokenlarni xotiraga yuklash. */
  async hydrate(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    accessToken = await secureStorage.get(STORAGE_KEYS.accessToken);
    refreshToken = await secureStorage.get(STORAGE_KEYS.refreshToken);
    return { accessToken, refreshToken };
  },

  setOnAuthFailure(cb: (() => void) | null) {
    onAuthFailure = cb;
  },

  triggerAuthFailure() {
    onAuthFailure?.();
  },
};
