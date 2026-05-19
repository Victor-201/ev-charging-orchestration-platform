'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api-client';
import { motion } from 'framer-motion';
import { CalendarCheck, Clock, MapPin, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Booking = {
  id: string;
  userId: string;
  chargerId: string;
  stationId: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  connectorType: string;
};

const STATUS_MAP: Record<string, string> = {
  PENDING: 'badge-warning',
  CONFIRMED: 'badge-success',
  ACTIVE: 'badge-info',
  COMPLETED: 'badge-muted',
  CANCELLED: 'badge-danger',
  NO_SHOW: 'badge-danger',
};

export default function BookingsPage() {
  const { t } = useTranslation(['dashboard', 'common']);

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: async () => (await apiClient.get('/bookings', { params: { limit: 50 } })).data,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold text-white">{t('dashboard:bookings.title')}</h1>
          <p className="text-text-muted text-sm mt-1">{t('dashboard:bookings.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-info/10 border border-info/20">
          <CalendarCheck className="w-4 h-4 text-info" />
          <span className="text-info text-xs font-semibold">
            {t('dashboard:bookings.total', { count: bookings?.length ?? 0 })}
          </span>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ev-table">
            <thead>
              <tr>
                <th>{t('dashboard:bookings.table.booking_id')}</th>
                <th>{t('dashboard:bookings.table.user')}</th>
                <th>{t('dashboard:bookings.table.charger')}</th>
                <th>{t('dashboard:bookings.table.connector')}</th>
                <th>{t('dashboard:bookings.table.start')}</th>
                <th>{t('dashboard:bookings.table.end')}</th>
                <th>{t('dashboard:bookings.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : bookings?.map((b) => (
                <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td className="font-mono text-xs text-white">{b.id.slice(0, 8)}…</td>
                  <td className="font-mono text-xs">{b.userId.slice(0, 8)}…</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-text-muted" />
                      <span className="font-mono text-xs">{b.chargerId.slice(0, 8)}…</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan" />
                      <span className="text-xs font-medium">{b.connectorType}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-success" />
                      {new Date(b.scheduledStartTime).toLocaleString('vi-VN')}
                    </div>
                  </td>
                  <td className="text-xs text-text-muted">
                    {new Date(b.scheduledEndTime).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_MAP[b.status] ?? 'badge-muted'}`}>
                      {t(`dashboard:data.status.${b.status}`, { defaultValue: b.status })}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {!bookings?.length && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-text-muted">
                    {t('common:common.no_data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
