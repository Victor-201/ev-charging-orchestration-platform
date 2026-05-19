'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Globe, Bell, ShieldCheck, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SettingsTab = 'general' | 'notifications' | 'security' | 'appearance';

const TABS: { key: SettingsTab; icon: React.ElementType; labelKey: string }[] = [
  { key: 'general',       icon: Globe,       labelKey: 'dashboard:settings.tab_general' },
  { key: 'notifications', icon: Bell,        labelKey: 'dashboard:settings.tab_notifications' },
  { key: 'security',      icon: ShieldCheck, labelKey: 'dashboard:settings.tab_security' },
  { key: 'appearance',    icon: Palette,     labelKey: 'dashboard:settings.tab_appearance' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { t, i18n } = useTranslation(['dashboard', 'common']);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-h2 font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-text-muted" />
          {t('dashboard:settings.title')}
        </h1>
        <p className="text-text-muted text-sm mt-1">{t('dashboard:settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="glass p-2 h-fit flex flex-col gap-1">
          {TABS.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-180 ${
                activeTab === key
                  ? 'bg-cyan/10 text-cyan border border-cyan/20'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-3 glass p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="font-semibold text-white">{t('dashboard:settings.tab_general')}</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                      {t('dashboard:settings.language')}
                    </label>
                    <div className="flex gap-2">
                      {(['vi', 'en'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            i18n.changeLanguage(lang);
                            document.cookie = `i18next=${lang}; path=/; max-age=31536000`;
                          }}
                          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-180 border ${
                            i18n.language === lang
                              ? 'bg-cyan/10 text-cyan border-cyan/25'
                              : 'text-text-muted border-white/10 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {lang === 'vi' ? '🇻🇳  Tiếng Việt' : '🇺🇸  English'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                      {t('dashboard:settings.platform_name')}
                    </label>
                    <p className="ev-input flex items-center text-text-muted text-sm cursor-not-allowed opacity-60 select-none">
                      {t('brand.name')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-white">{t('dashboard:settings.tab_notifications')}</h2>
                <p className="text-text-muted text-sm">{t('dashboard:settings.coming_soon')}</p>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-white">{t('dashboard:settings.tab_security')}</h2>
                <p className="text-text-muted text-sm">{t('dashboard:settings.coming_soon')}</p>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-white">{t('dashboard:settings.tab_appearance')}</h2>
                <p className="text-text-muted text-sm">{t('dashboard:settings.coming_soon')}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
