'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = (localStorage.getItem('ev-theme') || 'dark') as 'dark' | 'light';
    setTheme(stored);
    // Ensure the document matches the stored state on mount
    document.documentElement.setAttribute('data-theme', stored);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ev-theme', next);
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex items-center justify-between w-[64px] h-[32px] rounded-full p-1 border border-card-border cursor-pointer transition-all duration-300 shrink-0"
      style={{
        background: 'var(--pill-bg)',
        boxShadow: 'var(--pill-shadow)',
      }}
      aria-label="Toggle Theme"
    >
      {/* Active sliding indicator */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="absolute w-[24px] h-[24px] rounded-full flex items-center justify-center shadow-md z-10 pointer-events-none"
        style={{
          left: isDark ? 'auto' : '3px',
          right: isDark ? '3px' : 'auto',
          background: 'linear-gradient(135deg, var(--brand-cyan) 0%, var(--brand-lime) 100%)',
        }}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-white" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-white" />
        )}
      </motion.div>

      {/* Inactive indicators (displayed as icons in background) */}
      <div className="w-full flex justify-between px-1.5 text-text-faded select-none">
        <Sun className={`w-3.5 h-3.5 transition-opacity duration-300 ${!isDark ? 'opacity-0' : 'opacity-50'}`} />
        <Moon className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-50'}`} />
      </div>
    </button>
  );
}
