export enum BookingStatus {
  PENDING_PAYMENT = 'pending_payment', // Pending deposit payment (5 mins)
  CONFIRMED       = 'confirmed',       // Payment OK, QR token generated
  COMPLETED       = 'completed',       // Charging session started (QR scanned)
  CANCELLED       = 'cancelled',       // User cancelled -> 100% deposit refund
  EXPIRED         = 'expired',         // 5 mins without payment -> auto cancel
  NO_SHOW         = 'no_show',         // 10 mins grace period ended -> 20% deposit penalty
}

export const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING_PAYMENT,
  BookingStatus.CONFIRMED,
];

export const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.EXPIRED,
  BookingStatus.NO_SHOW,
];

/** Legacy alias - used in old DB queries */
export const BOOKABLE_STATUSES = ACTIVE_STATUSES;
