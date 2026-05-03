import { BookingTimeRange } from '../../src/domain/value-objects/booking-time-range.vo';
import { Booking } from '../../src/domain/aggregates/booking.aggregate';
import { BookingStatus } from '../../src/domain/value-objects/booking-status.vo';
import {
  InvalidBookingStateException,
} from '../../src/domain/exceptions/booking.exceptions';
import { DomainException } from '../../src/domain/exceptions/domain.exception';

const future = (offsetMinutes: number): Date =>
  new Date(Date.now() + offsetMinutes * 60_000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeBooking = () =>
  Booking.create({
    userId:              'user-001',
    chargerId:           'charger-001',
    timeRange:           new BookingTimeRange(future(60), future(120)),
    depositAmount:       50_000,
    connectorType:       'CCS2',
    pricePerKwhSnapshot: 3_858,
  });

const makeConfirmedBooking = () => {
  const b = makeBooking();
  b.confirmWithPayment('txn-001'); // QR generated internally
  return b;
};

// ─── BookingTimeRange ─────────────────────────────────────────────────────────

describe('BookingTimeRange (Value Object)', () => {
  it('creates valid range', () => {
    const range = new BookingTimeRange(future(60), future(120));
    expect(range.durationMinutes()).toBe(60);
  });

  it('rejects end before start', () => {
    expect(() => new BookingTimeRange(future(120), future(60))).toThrow(DomainException);
  });

  it('rejects duration < 15 min', () => {
    expect(() => new BookingTimeRange(future(60), future(70))).toThrow(DomainException);
  });

  it('rejects duration > 4 hours', () => {
    expect(() => new BookingTimeRange(future(60), future(60 + 241))).toThrow(DomainException);
  });

  it('detects overlapping ranges', () => {
    const r1 = new BookingTimeRange(future(60), future(120));
    const r2 = new BookingTimeRange(future(90), future(150));
    expect(r1.overlaps(r2)).toBe(true);
    expect(r2.overlaps(r1)).toBe(true);
  });

  it('does NOT overlap adjacent ranges', () => {
    const r1 = new BookingTimeRange(future(60), future(120));
    const r2 = new BookingTimeRange(future(120), future(180));
    expect(r1.overlaps(r2)).toBe(false);
  });

  it('does NOT overlap non-overlapping ranges', () => {
    const r1 = new BookingTimeRange(future(60), future(120));
    const r2 = new BookingTimeRange(future(150), future(210));
    expect(r1.overlaps(r2)).toBe(false);
  });
});

// ─── Booking Aggregate ────────────────────────────────────────────────────────

describe('Booking Aggregate — Auto-confirm FSM', () => {
  /**
   * Luồng mới: PENDING_PAYMENT → CONFIRMED → COMPLETED
   * (không còn confirm() thủ công — confirmWithPayment() do event trigger)
   */

  it('creates in PENDING_PAYMENT with depositAmount set', () => {
    const booking = makeBooking();
    expect(booking.status).toBe(BookingStatus.PENDING_PAYMENT);
    expect(booking.depositAmount).toBe(50_000);
    // create() emits 2 events: booking.created + booking.deposit_requested
    expect(booking.domainEvents).toHaveLength(2);
    expect(booking.domainEvents[0].eventType).toBe('session.booking_created_v1');
    expect(booking.domainEvents[1].eventType).toBe('session.reserved');
  });

  it('transitions PENDING_PAYMENT → CONFIRMED via confirmWithPayment()', () => {
    const booking = makeBooking();
    booking.confirmWithPayment('txn-001');
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
    expect(booking.depositTransactionId).toBe('txn-001');
    expect(booking.qrToken).not.toBeNull(); // generated internally
    // events: [0]=created, [1]=deposit_requested, [2]=confirmed
    expect(booking.domainEvents[2].eventType).toBe('booking.confirmed');
  });

  it('transitions CONFIRMED → COMPLETED via complete()', () => {
    const booking = makeConfirmedBooking();
    booking.complete();
    expect(booking.status).toBe(BookingStatus.COMPLETED);
    // events: [0]=created, [1]=deposit_requested, [2]=confirmed, [3]=completed
    expect(booking.domainEvents[3].eventType).toBe('booking.completed');
  });

  it('can cancel from PENDING_PAYMENT', () => {
    const booking = makeBooking();
    booking.cancel('user cancelled');
    expect(booking.status).toBe(BookingStatus.CANCELLED);
    // events: [0]=created, [1]=deposit_requested, [2]=cancelled
    expect(booking.domainEvents[2].eventType).toBe('booking.cancelled');
  });

  it('can cancel from CONFIRMED', () => {
    const booking = makeConfirmedBooking();
    booking.cancel('user changed mind');
    expect(booking.status).toBe(BookingStatus.CANCELLED);
  });

  it('can expire from PENDING_PAYMENT (payment timeout)', () => {
    const booking = makeBooking();
    booking.expire();
    expect(booking.status).toBe(BookingStatus.EXPIRED);
    // events: [0]=created, [1]=deposit_requested, [2]=expired
    expect(booking.domainEvents[2].eventType).toBe('booking.expired');
  });

  it('cannot confirmWithPayment if already CONFIRMED', () => {
    const booking = makeConfirmedBooking();
    expect(() => booking.confirmWithPayment('txn-002')).toThrow(InvalidBookingStateException);
  });

  it('cannot complete from PENDING_PAYMENT', () => {
    const booking = makeBooking();
    expect(() => booking.complete()).toThrow(InvalidBookingStateException);
  });

  it('cannot cancel COMPLETED booking', () => {
    const booking = makeConfirmedBooking();
    booking.complete();
    expect(() => booking.cancel('test')).toThrow(InvalidBookingStateException);
  });

  it('can mark NO_SHOW from CONFIRMED (no-show penalty)', () => {
    const booking = makeConfirmedBooking();
    booking.markNoShow();
    expect(booking.status).toBe(BookingStatus.NO_SHOW);
    // makeConfirmedBooking: [0]=created [1]=deposit_requested [2]=confirmed [3]=no_show
    expect(booking.domainEvents[3].eventType).toBe('booking.no_show');
  });

  it('clears domain events after clearDomainEvents()', () => {
    const booking = makeBooking();
    booking.clearDomainEvents();
    expect(booking.domainEvents).toHaveLength(0);
  });
});
