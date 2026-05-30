'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api-client';
import { motion } from 'framer-motion';
import { Bell, Info, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { relativeTimeLocale } from '@/i18n/formatter';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  SESSION_START:    <Zap className="w-4 h-4 text-cyan" />,
  SESSION_END:      <CheckCircle2 className="w-4 h-4 text-success" />,
  PAYMENT_SUCCESS:  <CheckCircle2 className="w-4 h-4 text-lime" />,
  INCIDENT_RAISED:  <AlertTriangle className="w-4 h-4 text-danger" />,
  MAINTENANCE:      <AlertTriangle className="w-4 h-4 text-warning" />,
};

export default function NotificationsPage() {
  const { t } = useTranslation(['dashboard', 'common']);

  const { data: responseData, isLoading } = useQuery<{ items: Notification[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: async () =>
      (await apiClient.get('/notifications', { params: { limit: 50 } })).data,
    refetchInterval: 15_000,
  });

  const notifications = responseData?.items;
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold text-white">
            {t('dashboard:notifications.title')}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {t('dashboard:notifications.subtitle')}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-danger/10 border border-danger/20">
            <Bell className="w-4 h-4 text-danger" />
            <span className="text-danger text-xs font-semibold">
              {t('dashboard:notifications.unread', { count: unreadCount })}
            </span>
          </div>
        )}
      </div>

      <div className="glass overflow-hidden divide-y divide-white/5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5 flex gap-4 items-start">
              <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/5 rounded animate-pulse w-1/3" />
                <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))
        ) : notifications?.length ? (
          notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-5 flex gap-4 items-start hover:bg-white/[0.02] transition-colors ${
                !n.isRead ? 'bg-cyan/[0.02]' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                {TYPE_ICON[n.type] ?? <Info className="w-4 h-4 text-text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <p className={`text-sm font-semibold ${!n.isRead ? 'text-white' : 'text-text-secondary'}`}>
                    {n.title}
                  </p>
                  <span className="text-xs text-text-muted shrink-0">
                    {relativeTimeLocale(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{n.body}</p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 rounded-full bg-cyan shrink-0 mt-1.5" />
              )}
            </motion.div>
          ))
        ) : (
          <div className="py-16 flex flex-col items-center gap-3 text-text-muted">
            <Bell className="w-10 h-10 opacity-20" />
            <p className="text-sm">{t('common:common.no_data')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
