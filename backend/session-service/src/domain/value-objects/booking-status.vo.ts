export enum BookingStatus {
  PENDING_PAYMENT = 'pending_payment', // Chờ thanh toán deposit (5 phút)
  CONFIRMED       = 'confirmed',       // Thanh toán OK, QR token đã sinh
  COMPLETED       = 'completed',       // Session sạc đã bắt đầu (QR đã quét)
  CANCELLED       = 'cancelled',       // User tự hủy → hoàn 100% deposit
  EXPIRED         = 'expired',         // Hết 5 phút không thanh toán → auto hủy
  NO_SHOW         = 'no_show',         // Hết 10 phút grace period → phạt 20% deposit
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

/** Legacy alias — dùng trong các query DB cũ */
export const BOOKABLE_STATUSES = ACTIVE_STATUSES;
