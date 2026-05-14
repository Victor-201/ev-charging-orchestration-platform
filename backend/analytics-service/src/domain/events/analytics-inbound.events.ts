/**
 * Analytics Domain Events.
 * Represents inbound event models mapped from upstream services for type-safe RabbitMQ consumption.
 */

// Inbound Events from charging-service

export interface SessionStartedPayload {
  eventType:    'session.started';
  eventId:      string;
  sessionId:    string;
  userId:       string;
  chargerId:    string;
  bookingId:    string | null;
  stationId?:   string;    // Enriched if available
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

// Inbound Events from payment-service

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

// Inbound Events from booking-service

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

// Union type

export type AnalyticsInboundEvent =
  | SessionStartedPayload
  | SessionCompletedPayload
  | PaymentCompletedPayload
  | BookingCreatedPayload
  | BookingConfirmedPayload
  | BookingCancelledPayload;
