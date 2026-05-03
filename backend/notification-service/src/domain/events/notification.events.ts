/**
 * Notification Inbound Events — type-safe mapping từ upstream services.
 *
 * PHASE 1 – EVENT MAPPING:
 *
 * Source Event                → Notification Type         → Channels
 * ─────────────────────────────────────────────────────────────────────
 * booking.created             → booking.created          → in_app + realtime
 * booking.confirmed           → booking.confirmed        → push + realtime
 * booking.cancelled           → booking.cancelled        → push + in_app
 * payment.completed           → payment.completed        → push + in_app
 * session.started             → session.started          → push + realtime
 * session.completed           → session.completed        → push + email
 * queue.updated (queue.*)     → queue.updated            → realtime (socket only)
 */

// ─── Booking Events ───────────────────────────────────────────────────────────

export interface BookingCreatedEvent {
  eventType:  'booking.created';
  eventId:    string;
  bookingId:  string;
  userId:     string;
  chargerId:  string;
  stationId?: string;
  startTime:  string;   // ISO
  endTime:    string;
}

export interface BookingConfirmedEvent {
  eventType:   'booking.confirmed';
  eventId:     string;
  bookingId:   string;
  userId:      string;
  chargerId:   string;
  stationId?:  string;
  stationName?: string;
  startTime?:  string;
}

export interface BookingCancelledEvent {
  eventType:  'booking.cancelled';
  eventId:    string;
  bookingId:  string;
  userId:     string;
  reason?:    string;
}

// ─── Payment Events ───────────────────────────────────────────────────────────

export interface PaymentCompletedEvent {
  eventType:     'payment.completed';
  eventId:       string;
  transactionId: string;
  userId:        string;
  amount:        number;    // VND
  relatedId?:    string;    // bookingId
}

export interface PaymentFailedEvent {
  eventType:     'payment.failed';
  eventId:       string;
  transactionId: string;
  userId:        string;
  amount:        number;
  reason?:       string;
}

// ─── Charging Events ──────────────────────────────────────────────────────────

export interface SessionStartedEvent {
  eventType:    'session.started';
  eventId:      string;
  sessionId:    string;
  userId:       string;
  chargerId:    string;
  bookingId?:   string;
  stationId?:   string;
  startTime:    string;
}

export interface SessionCompletedEvent {
  eventType:       'session.completed';
  eventId:         string;
  sessionId:       string;
  userId:          string;
  chargerId:       string;
  kwhConsumed:     number;
  durationMinutes: number;
  stationId?:      string;
  bookingId?:      string;
  endTime:         string;
}

// ─── Queue Events ─────────────────────────────────────────────────────────────

export interface QueueUpdatedEvent {
  eventType:    'queue.updated';
  eventId:      string;
  queueId:      string;
  userId:       string;
  chargerId:    string;
  stationId?:   string;
  position:     number;
  estimatedWaitMinutes: number;
  status:       'waiting' | 'moved' | 'called' | 'expired';
}

// ─── Billing Notification Events ─────────────────────────────────────────────

export interface BillingIdleFeeChargedEvent {
  eventType:             'billing.idle_fee_charged_v1';
  eventId:               string;
  sessionId:             string;
  userId:                string;
  idleFeeVnd:            number;
  chargeableIdleMinutes: number;
  idleFeePerMinuteVnd:   number;
  idleGraceMinutes:      number;
  transactionId:         string;
}

export interface BillingExtraChargeEvent {
  eventType:       'billing.extra_charge_v1';
  eventId:         string;
  sessionId:       string;
  userId:          string;
  extraAmountVnd:  number;
  depositAmount:   number;
  totalFeeVnd:     number;
  transactionId:   string;
}

export interface BillingRefundIssuedEvent {
  eventType:        'billing.refund_issued_v1';
  eventId:          string;
  sessionId:        string;
  userId:           string;
  refundAmountVnd:  number;
  depositAmount:    number;
  totalFeeVnd:      number;
  transactionId:    string;
}

// ─── Notification Template ────────────────────────────────────────────────────

/** Hàm build notification content từ event payload */
export interface NotificationTemplate {
  title:   (payload: any) => string;
  body:    (payload: any) => string;
}

/** Centralized template registry */
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  'booking.created': {
    title: ()        => 'Đặt lịch thành công ✅',
    body:  (p: BookingCreatedEvent) =>
      `Lịch sạc #${p.bookingId.slice(0,8)} đã được tạo. Bắt đầu: ${new Date(p.startTime).toLocaleString('vi-VN')}.`,
  },
  'booking.confirmed': {
    title: ()        => 'Lịch sạc được xác nhận 🔋',
    body:  (p: BookingConfirmedEvent) =>
      `Lịch sạc #${p.bookingId.slice(0,8)}${p.stationName ? ` tại ${p.stationName}` : ''} đã được xác nhận!`,
  },
  'booking.cancelled': {
    title: ()        => 'Lịch sạc đã hủy ❌',
    body:  (p: BookingCancelledEvent) =>
      `Lịch sạc #${p.bookingId.slice(0,8)} đã bị hủy.${p.reason ? ` Lý do: ${p.reason}` : ''}`,
  },
  'payment.completed': {
    title: ()        => 'Thanh toán thành công 💳',
    body:  (p: PaymentCompletedEvent) =>
      `Thanh toán ${p.amount.toLocaleString('vi-VN')} VND thành công.`,
  },
  'payment.failed': {
    title: ()        => 'Thanh toán thất bại ⚠️',
    body:  (p: PaymentFailedEvent) =>
      `Thanh toán ${p.amount.toLocaleString('vi-VN')} VND thất bại.${p.reason ? ` ${p.reason}` : ' Vui lòng thử lại.'}`,
  },
  'session.started': {
    title: ()        => 'Bắt đầu sạc ⚡',
    body:  (p: SessionStartedEvent) =>
      `Phiên sạc của bạn đã bắt đầu lúc ${new Date(p.startTime).toLocaleTimeString('vi-VN')}.`,
  },
  'session.completed': {
    title: ()        => 'Sạc hoàn tất! 🎉',
    body:  (p: SessionCompletedEvent) =>
      `Bạn đã sạc ${p.kwhConsumed.toFixed(2)} kWh trong ${Math.round(p.durationMinutes)} phút. Cảm ơn!`,
  },
  'queue.updated': {
    title: ()        => 'Cập nhật hàng đợi 📋',
    body:  (p: QueueUpdatedEvent) =>
      p.status === 'called'
        ? `Đến lượt bạn! Hãy đến trạm sạc ngay.`
        : `Vị trí của bạn trong hàng đợi: #${p.position}. Chờ khoảng ${p.estimatedWaitMinutes} phút.`,
  },
  'billing.idle_fee_charged_v1': {
    title: ()        => 'Phí chiếm dụng trụ sạc ⏰',
    body:  (p: BillingIdleFeeChargedEvent) =>
      `Xe bạn đã cắm súng ${p.chargeableIdleMinutes + p.idleGraceMinutes} phút sau khi sạc đầy ` +
      `(${p.idleGraceMinutes} phút miễn phí). Phí chiếm dụng: ${p.idleFeeVnd.toLocaleString('vi-VN')} VND ` +
      `(${p.idleFeePerMinuteVnd.toLocaleString('vi-VN')} VND/phút × ${p.chargeableIdleMinutes} phút). Vui lòng rút súng!`,
  },
  'billing.extra_charge_v1': {
    title: ()        => 'Trừ thêm từ ví 💳',
    body:  (p: BillingExtraChargeEvent) =>
      `Phiên sạc của bạn tốn tổng ${p.totalFeeVnd.toLocaleString('vi-VN')} VND ` +
      `(cọc: ${p.depositAmount.toLocaleString('vi-VN')} VND). ` +
      `Đã trừ thêm ${p.extraAmountVnd.toLocaleString('vi-VN')} VND từ ví.`,
  },
  'billing.refund_issued_v1': {
    title: ()        => 'Hoàn tiền vào ví 💰',
    body:  (p: BillingRefundIssuedEvent) =>
      `Phiên sạc hoàn tất. Tổng phí: ${p.totalFeeVnd.toLocaleString('vi-VN')} VND. ` +
      `Đã hoàn ${p.refundAmountVnd.toLocaleString('vi-VN')} VND tiền cọc thừa về ví của bạn.`,
  },
};
