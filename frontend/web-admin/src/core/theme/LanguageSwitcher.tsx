'use client';

import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
    Cookies.set('i18next', nextLang, { expires: 365, path: '/' });
  };

  const isVi = currentLang === 'vi';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="relative flex items-center justify-between w-[80px] h-[32px] rounded-full p-1 border border-card-border cursor-pointer transition-all duration-300 shrink-0"
      style={{
        background: 'var(--pill-bg)',
        boxShadow: 'var(--pill-shadow)',
      }}
      aria-label="Change Language"
    >
      {/* Sliding Highlight Plate */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="absolute w-[35px] h-[24px] rounded-lg z-10 pointer-events-none"
        style={{
          left: isVi ? '3px' : 'auto',
          right: isVi ? 'auto' : '3px',
          background: 'rgba(16, 191, 201, 0.15)',
          border: '1px solid rgba(16, 191, 201, 0.35)',
        }}
      />

      {/* Label Text Layer */}
      <div className="w-full flex justify-between px-2.5 z-20 text-[11px] font-bold tracking-wider select-none leading-none items-center">
        <span className={isVi ? 'text-cyan' : 'text-text-faded'}>VI</span>
        <span className={!isVi ? 'text-cyan' : 'text-text-faded'}>EN</span>
      </div>
    </button>
  );
}
