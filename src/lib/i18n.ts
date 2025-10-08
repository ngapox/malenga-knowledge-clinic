import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import your translation files
import enCommon from '@/locales/en/common.json';
import swCommon from '@/locales/sw/common.json';

export const supportedLngs = ['en', 'sw'];
export const fallbackLng = 'en';

const initI18next = async (lang?: string, ns?: string) => {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      supportedLngs: supportedLngs,
      fallbackLng: fallbackLng,
      lng: lang,
      resources: {
        en: {
          common: enCommon,
        },
        sw: {
          common: swCommon,
        },
      },
    });
  return i18nInstance;
};

export default initI18next;