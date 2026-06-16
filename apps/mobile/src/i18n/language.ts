import i18n, { SUPPORTED_LANGUAGES, type AppLanguage } from './index';
import { secureStorage, STORAGE_KEYS } from '@/lib/secure-storage';

export async function setLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await secureStorage.set(STORAGE_KEYS.language, lang);
}

/** Ilova ishga tushganda saqlangan tilni tiklash. */
export async function restoreLanguage(): Promise<void> {
  const saved = (await secureStorage.get(STORAGE_KEYS.language)) as AppLanguage | null;
  if (saved && SUPPORTED_LANGUAGES.includes(saved) && saved !== i18n.language) {
    await i18n.changeLanguage(saved);
  }
}
