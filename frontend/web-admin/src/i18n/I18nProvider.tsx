/**
 * Internationalization Provider Component
 *
 * Synchronizes cookies and local storage localization preferences with i18next
 * and guards the child React tree against SSR/hydration mismatch state anomalies.
 */

'use client';

import { I18nextProvider } from 'react-i18next';
import i18next from './index';
import { ReactNode, useEffect, useState } from 'react';
import Cookies from 'js-cookie';

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Synchronizes persistent localization states across requests to support SSR-compatible lang detection.
    const savedLang = Cookies.get('i18next') || localStorage.getItem('i18nextLng') || 'vi';
    if (i18next.language !== savedLang) {
      i18next.changeLanguage(savedLang);
    }
    document.documentElement.lang = i18next.language;
    
    // Updates HTML document locale dynamically in response to user language context transitions.
    const handleLanguageChange = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18next.on('languageChanged', handleLanguageChange);
    
    setMounted(true);
    
    return () => {
      i18next.off('languageChanged', handleLanguageChange);
    };
  }, []);

  // Defers rendering of children to prevent React hydration mismatches on client mounts.
  if (!mounted) {
    return <div className="min-h-screen bg-[#121212]" />;
  }

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}
