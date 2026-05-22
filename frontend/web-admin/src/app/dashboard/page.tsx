'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api-client';
import { formatCurrency } from '@/i18n/formatter';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Zap, TrendingUp, Users, Activity, Battery, DollarSign, MapPin, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';

interface DashboardData {
  latestKpi: { activeSessions: number; revenue30d: number; newUsers30d: number };
  revenue30d: { period: string; totalRevenueVnd: number }[];
  peakHours: { hour: number; avgSessions: number }[];
  topStations: { stationId: string; revenue: number; utilizationRate: number }[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--card-border)',
        borderRadius: '14px',
        padding: '10px 14px',
        color: 'var(--text-main)',
        fontSize: 12,
      }}
    >
      <p style={{ color: 'var(--text-faded)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontWeight: 600, color: '#10bfc9' }}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function MetricCard({
  title, value, sub, icon: Icon, gradient, glow, trend
}: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string; glow: string; trend?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(60px)',
        WebkitBackdropFilter: 'blur(60px)',
        border: '1.5px solid var(--card-border)',
        borderRadius: '28px',
        padding: '24px',
        boxShadow: 'var(--card-shadow)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
      whileHover={{ translateY: -4, transition: { duration: 0.2 } }}
    >
      {/* Corner markers */}
      <div className="corner-marker cm-tl" />
      <div className="corner-marker cm-tr" />
      {/* Shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[28px]"
        style={{ background: 'var(--sq-shine)' }}
      />
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: gradient, boxShadow: `0 8px 24px ${glow}` }}
        >
          <div className="absolute inset-0" style={{ background: 'var(--sq-shine)' }} />
          <Icon className="w-5 h-5 text-white relative z-10" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-faded)' }}>{title}</p>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-faded)' }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(60px)',
        WebkitBackdropFilter: 'blur(60px)',
        border: '1.5px solid var(--card-border)',
        borderRadius: '28px',
        boxShadow: 'var(--card-shadow)',
        padding: '28px',
        transition: 'border-color 0.4s ease',
      }}
    >
      {/* Corner markers */}
      <div className="corner-marker cm-tl" />
      <div className="corner-marker cm-tr" />
      <div className="corner-marker cm-bl" />
      <div className="corner-marker cm-br" />
      {/* Shine */}
      <div className="absolute inset-0 pointer-events-none rounded-[28px]" style={{ background: 'var(--sq-shine)' }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => (await apiClient.get('/analytics/dashboard')).data,
    refetchInterval: 30_000,
  });

  const kpi = data?.latestKpi;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {t('dashboard:home.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-faded)' }}>{t('dashboard:home.subtitle')}</p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
          }}
        >
          <span className="glow-dot bg-success animate-pulse-glow" />
          <span className="text-success text-xs font-semibold">{t('common:common.live')}</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('dashboard:home.kpi.active_sessions')}
          value={isLoading ? '—' : (kpi?.activeSessions ?? 0)}
          icon={Battery}
          gradient="linear-gradient(135deg, #10bfc9, #19be4b)"
          glow="rgba(16, 191, 201, 0.4)"
          trend={12}
        />
        <MetricCard
          title={t('dashboard:home.kpi.revenue_30d')}
          value={isLoading ? '—' : formatCurrency(kpi?.revenue30d ?? 0)}
          icon={DollarSign}
          gradient="linear-gradient(135deg, #f6d365, #fda085)"
          glow="rgba(253, 160, 133, 0.4)"
          trend={8}
        />
        <MetricCard
          title={t('dashboard:home.kpi.new_users_30d')}
          value={isLoading ? '—' : (kpi?.newUsers30d ?? 0)}
          icon={Users}
          gradient="linear-gradient(135deg, #89f7fe, #66a6ff)"
          glow="rgba(102, 166, 255, 0.4)"
          trend={5}
        />
        <MetricCard
          title={t('dashboard:home.kpi.conversion_rate')}
          value="78.4%"
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #ffd3a5, #fd6585)"
          glow="rgba(253, 101, 133, 0.4)"
          trend={3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassPanel className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-main)' }}>{t('dashboard:home.charts.revenue_title')}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faded)' }}>{t('dashboard:home.charts.revenue_sub')}</p>
            </div>
            <Activity className="w-5 h-5" style={{ color: 'var(--text-faded)' }} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.revenue30d ?? []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10bfc9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10bfc9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="period" tick={{ fill: 'var(--text-faded)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-faded)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1e6).toFixed(0)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="totalRevenueVnd" stroke="#10bfc9" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-main)' }}>{t('dashboard:home.charts.peak_title')}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faded)' }}>{t('dashboard:home.charts.peak_sub')}</p>
            </div>
            <Zap className="w-5 h-5" style={{ color: 'var(--text-faded)' }} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.peakHours ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: 'var(--text-faded)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
              <YAxis tick={{ fill: 'var(--text-faded)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  fontSize: 12,
                  color: 'var(--text-main)',
                }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="avgSessions" fill="#9aed57" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPanel>
      </div>

      {/* Top Stations */}
      <GlassPanel>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-main)' }}>{t('dashboard:home.charts.top_stations_title')}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faded)' }}>{t('dashboard:home.charts.top_stations_sub')}</p>
          </div>
          <MapPin className="w-5 h-5" style={{ color: 'var(--text-faded)' }} />
        </div>
        <div className="overflow-x-auto">
          <table className="ev-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('dashboard:home.table.station_id')}</th>
                <th>{t('dashboard:home.table.revenue')}</th>
                <th>{t('dashboard:home.table.utilization')}</th>
                <th>{t('dashboard:home.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topStations ?? []).map((s, i) => (
                <tr key={s.stationId}>
                  <td style={{ color: 'var(--text-faded)' }}>{i + 1}</td>
                  <td className="font-mono text-xs" style={{ color: 'var(--text-main)' }}>{s.stationId.slice(0, 8)}…</td>
                  <td style={{ color: '#10bfc9', fontWeight: 600 }}>{formatCurrency(s.revenue)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--sq-3-bg)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.utilizationRate}%`,
                            background: 'linear-gradient(135deg, #10bfc9, #9aed57)',
                          }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-faded)' }}>{s.utilizationRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td><span className="badge badge-success">{t('dashboard:data.status.ACTIVE')}</span></td>
                </tr>
              ))}
              {!data?.topStations?.length && (
                <tr>
                  <td colSpan={5} className="text-center py-8" style={{ color: 'var(--text-faded)' }}>{t('common:common.no_data')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
