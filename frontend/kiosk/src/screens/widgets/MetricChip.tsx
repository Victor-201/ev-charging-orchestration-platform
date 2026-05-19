/**
 * EVOLTTOUCH Kiosk — MetricChip Widget
 *
 * Compact metric summary card used in ChargingDashboard session stats.
 * Supports default and danger variant styling via CSS Custom Properties.
 *
 * L-RE-4: All color references use CSS variables from index.css.
 *          No hardcoded hex or rgba values.
 */

import React from 'react';

interface MetricChipProps {
  label: string;
  value: string;
  unit?: string;
  variant?: 'default' | 'danger';
}

const MetricChip: React.FC<MetricChipProps> = ({
  label,
  value,
  unit,
  variant = 'default',
}) => (
  <div
    className={`metric-card transition-all duration-500 flex flex-col justify-center items-center py-6 ${
      variant === 'danger'
        ? 'bg-[var(--danger)]/10 border border-[var(--danger)]/50 shadow-[0_0_20px_var(--red-glow)]'
        : ''
    }`}
  >
    <p
      className={`mb-3 text-base font-bold uppercase tracking-widest ${
        variant === 'danger'
          ? 'text-[var(--danger)] opacity-90'
          : 'text-[var(--text-secondary)] opacity-70'
      }`}
    >
      {label}
    </p>
    <p
      className={`text-4xl font-black tabular-nums flex items-baseline gap-2 ${
        variant === 'danger'
          ? 'text-[var(--danger)] drop-shadow-[0_0_8px_var(--red-glow)]'
          : ''
      }`}
    >
      <span>{value}</span>
      {unit && (
        <span className="text-2xl font-black opacity-40">{unit}</span>
      )}
    </p>
  </div>
);

export default MetricChip;
