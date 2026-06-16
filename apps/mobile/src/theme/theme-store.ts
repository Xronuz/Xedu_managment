import { create } from 'zustand';
import { secureStorage, STORAGE_KEYS } from '@/lib/secure-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: (mode) => {
    set({ mode });
    secureStorage.set(STORAGE_KEYS.theme, mode);
  },
  hydrate: async () => {
    const saved = await secureStorage.get(STORAGE_KEYS.theme);
    if (saved === 'light' || saved === 'dark' || saved === 'system') set({ mode: saved });
  },
}));
