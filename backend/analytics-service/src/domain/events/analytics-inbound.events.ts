/**
 * Analytics Domain Events — events được map từ upstream services.
 *
 * Không phải domain events của analytics-service.
 * Đây là các inbound event models dùng để type-safe consume từ RabbitMQ.
 */

// ─── Inbound Events từ charging-service ──────────────────────────────────────

export interface SessionStartedPayload {
  eventType:    'session.started';
  eventId:      string;
  sessionId:    string;
  userId:       string;
  chargerId:    string;
  bookingId:    string | null;
  stationId?:   string;    // Enriched nếu có
  startTime:    string;
  startMeterWh: number;
}

export interface SessionCompletedPayload {
  eventType:       'session.completed';
  eventId:         string;
  sessionId:       string;
  userId:          string;
  chargerId:       string;
  bookingId:       string | null;
  stationId?:      string;
  kwhConsumed:     number;
  durationMinutes: number;
  endTime:         string;
}

// ─── Inbound Events từ payment-service ───────────────────────────────────────

export interface PaymentCompletedPayload {
  eventType:    'payment.completed';
  eventId:      string;
  transactionId: string;
  userId:        string;
  amount:        number;   // VND
  relatedId:     string | null;    // bookingId
  relatedType:   string | null;    // 'booking'
  occurredAt:    string;
}

// ─── Inbound Events từ booking-service ───────────────────────────────────────

export interface BookingCreatedPayload {
  eventType:   'booking.created';
  eventId:     string;
  bookingId:   string;
  userId:      string;
  chargerId:   string;
  stationId?:  string;
  startTime:   string;
  endTime:     string;
}

export interface BookingConfirmedPayload {
  eventType:  'booking.confirmed';
  eventId:    string;
  bookingId:  string;
  userId:     string;
  chargerId:  string;
  stationId?: string;
}

export interface BookingCancelledPayload {
  eventType:  'booking.cancelled';
  eventId:    string;
  bookingId:  string;
  userId:     string;
  chargerId:  string;
  stationId?: string;
  reason?:    string;
}

// ─── Union type ───────────────────────────────────────────────────────────────

export type AnalyticsInboundEvent =
  | SessionStartedPayload
  | SessionCompletedPayload
  | PaymentCompletedPayload
  | BookingCreatedPayload
  | BookingConfirmedPayload
  | BookingCancelledPayload;
