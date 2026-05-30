/**
 * EVOLTTOUCH Kiosk — BillingRow Widget
 *
 * Single row in the billing summary table inside ChargingDashboard.
 * Renders a label-value pair with muted label and bold value.
 *
 * L-RE-4: Uses CSS Custom Properties from index.css only.
 */

import React from 'react';

interface BillingRowProps {
  label: string;
  value: string;
}

const BillingRow: React.FC<BillingRowProps> = ({ label, value }) => (
  <div className="flex justify-between items-center text-base">
    <span className="text-[var(--text-muted)] font-medium">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

export default BillingRow;
