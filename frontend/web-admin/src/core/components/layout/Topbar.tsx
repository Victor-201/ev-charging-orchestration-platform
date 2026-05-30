'use client';

import { useAuthStore } from '@/features/auth/store/auth.store';
import { Bell, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '@/core/theme/ThemeToggle';
import LanguageSwitcher from '@/core/theme/LanguageSwitcher';

export default function Topbar() {
  const { user } = useAuthStore();
  const { t } = useTranslation('common');

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-6 h-[64px]"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderBottom: '1px solid var(--card-border)',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-sm">
        <div className="relative w-full">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: 'var(--text-faded)' }} 
          />
          <input
            type="text"
            placeholder={t('topbar.search_placeholder')}
            className="ev-input pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Shared sliding controls */}
        <LanguageSwitcher />
        <ThemeToggle />

        <button 
          className="btn-secondary w-9 h-9 flex items-center justify-center p-0 relative"
          style={{ borderRadius: '50px' }}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-danger rounded-full" />
        </button>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-glow-sm cursor-pointer ml-2 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, var(--brand-cyan) 0%, var(--brand-lime) 100%)',
            boxShadow: '0 0 10px rgba(16,191,201,0.3)',
          }}
        >
          <div className="absolute inset-0" style={{ background: 'var(--sq-shine)' }} />
          <span className="relative z-10">
            {user?.fullName?.[0] || user?.email?.[0] || 'A'}
          </span>
        </div>
      </div>
    </header>
  );
}
