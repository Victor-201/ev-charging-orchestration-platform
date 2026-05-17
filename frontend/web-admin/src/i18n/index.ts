/**
 * Internationalization Bootstrapping Service
 *
 * Configures i18next-browser-languagedetector and react-i18next
 * to manage English and Vietnamese localization contexts.
 *
 * Depends on: locales/en, locales/vi
 * Owned by: Core Platform Team
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Imports translation assets synchronously to prevent layout shifts or unlocalized flashes on client mount.
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import viCommon from './locales/vi/common.json';
import viDashboard from './locales/vi/dashboard.json';

const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
  },
  vi: {
    common: viCommon,
    dashboard: viDashboard,
  },
};

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en'],
    defaultNS: 'common',
    ns: ['common', 'dashboard'],
    interpolation: {
      // Disables interpolation escaping because React natively guards against XSS injection.
      escapeValue: false,
    },
    detection: {
      order: ['cookie', 'localStorage', 'navigator'],
      caches: ['cookie', 'localStorage'],
    },
  });

export default i18next;
