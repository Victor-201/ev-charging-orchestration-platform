/**
 * EVOLTTOUCH Kiosk — HudMetric Widget
 *
 * Corner HUD metric display for ChargingDashboard.
 * Renders a labeled data value with icon in HUD style.
 *
 * L-RE-4: Uses CSS Custom Properties from index.css only.
 */

import React from 'react';

interface HudMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  align?: 'left' | 'right';
  highlight?: boolean;
}

const HudMetric: React.FC<HudMetricProps> = ({
  icon,
  label,
  value,
  unit,
  align = 'left',
  highlight = false,
}) => (
  <div className={align === 'right' ? 'text-right' : 'text-left'}>
    <div
      className={`flex items-center gap-1.5 caption mb-1.5 ${
        align === 'right' ? 'justify-end' : ''
      }`}
    >
      <span className="text-[var(--primary)]">{icon}</span>
      {label}
    </div>
    <p className="text-3xl font-bold tabular-nums flex items-baseline gap-1">
      <span className={highlight ? 'text-gradient' : ''}>{value}</span>
      <span className="text-xl font-bold opacity-40">{unit}</span>
    </p>
  </div>
);

export default HudMetric;
