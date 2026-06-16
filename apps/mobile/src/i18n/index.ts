import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import uz from './uz.json';
import ru from './ru.json';

export const SUPPORTED_LANGUAGES = ['uz', 'ru'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectLanguage(): AppLanguage {
  const locale = getLocales()[0]?.languageCode ?? 'uz';
  return locale === 'ru' ? 'ru' : 'uz';
}

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
  },
  lng: detectLanguage(),
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

export default i18n;
