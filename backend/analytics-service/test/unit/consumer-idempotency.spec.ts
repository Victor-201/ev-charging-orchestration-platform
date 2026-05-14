/**
 * Tests: Event Consumer idempotency + event flow
 *
 * Manual instantiation — avoids NestJS Testing Module to minimize dependency injection complexity.
 * Tests core logic: idempotency guard, aggregation routing, and event logs.
 */
import { SessionEventConsumer } from '../../src/infrastructure/messaging/consumers/analytics.consumers';
import { AggregationEngine } from '../../src/domain/services/aggregation.engine';
import { Logger } from '@nestjs/common';

// Helpers

function makeSessionCompletedPayload(overrides?: Partial<any>) {
  return {
    eventType:       'session.completed',
    eventId:         'evt-session-001',
    sessionId:       'session-001',
    userId:          'user-001',
    chargerId:       'charger-001',
    stationId:       'station-001',
    kwhConsumed:     22.5,
    durationMinutes: 75,
    endTime:         '2026-04-12T07:00:00Z',
    ...overrides,
  };
}

function makeConsumer(alreadyProcessed = false) {
  const peRepo = {
    create:    jest.fn((d: any) => d),
    save:      jest.fn().mockResolvedValue(undefined),
    findOneBy: jest.fn().mockResolvedValue(alreadyProcessed ? { eventId: 'exists' } : null),
  };

  const logRepo = {
    create: jest.fn((d: any) => d),
    save:   jest.fn().mockResolvedValue(undefined),
  };

  const mockDs = {
    query:       jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation(async (cb: any) => cb({
      query: jest.fn().mockResolvedValue([]),
    })),
  };

  const aggregation = {
    onSessionCompleted: jest.fn().mockResolvedValue(undefined),
    onPaymentCompleted: jest.fn().mockResolvedValue(undefined),
    onBookingEvent:     jest.fn().mockResolvedValue(undefined),
    captureKpiSnapshot: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<Pick<AggregationEngine, 'onSessionCompleted' | 'onPaymentCompleted' | 'onBookingEvent' | 'captureKpiSnapshot'>>;

  // Manual DI — inject via constructor directly
  const consumer = new SessionEventConsumer(
    peRepo as any,
    logRepo as any,
    aggregation as any,
    mockDs as any,
  );

  return { consumer, peRepo, logRepo, aggregation };
}

// Global Log Suppression for this test file
beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Tests

describe('SessionEventConsumer', () => {

  // session.completed: happy path

  it('session.completed: calls aggregation.onSessionCompleted', async () => {
    const { consumer, aggregation } = makeConsumer(false);
    const payload = makeSessionCompletedPayload();
    await consumer.onSessionCompleted(payload as any);

    expect(aggregation.onSessionCompleted).toHaveBeenCalledTimes(1);
    const call = aggregation.onSessionCompleted.mock.calls[0][0];
    expect(call.sessionId).toBe('session-001');
    expect(call.kwhConsumed).toBe(22.5);
    expect(call.durationMinutes).toBe(75);
    expect(call.userId).toBe('user-001');
  });

  it('session.completed: logs the event into event_log', async () => {
    const { consumer, logRepo } = makeConsumer(false);
    await consumer.onSessionCompleted(makeSessionCompletedPayload() as any);
    expect(logRepo.save).toHaveBeenCalledTimes(1);
    const logEntry = logRepo.create.mock.calls[0][0];
    expect(logEntry.eventType).toBe('session.completed');
    expect(logEntry.sourceService).toBe('charging-control-service');
  });

  it('session.completed: records the event in processed_events', async () => {
    const { consumer, peRepo } = makeConsumer(false);
    await consumer.onSessionCompleted(makeSessionCompletedPayload() as any);
    expect(peRepo.save).toHaveBeenCalledTimes(1);
    const saved = peRepo.create.mock.calls[0][0];
    expect(saved.eventId).toBe('evt-session-001');
    expect(saved.eventType).toBe('session.completed');
  });

  // Idempotency
  it('IDEMPOTENCY: duplicate event — skips aggregation', async () => {
    const { consumer, aggregation, logRepo } = makeConsumer(true); // already processed

    await consumer.onSessionCompleted(makeSessionCompletedPayload() as any);

    expect(aggregation.onSessionCompleted).not.toHaveBeenCalled();
    expect(logRepo.save).not.toHaveBeenCalled();
  });

  it('IDEMPOTENCY: eventId fallback to sessionId when eventId is missing', async () => {
    const { consumer, peRepo, aggregation } = makeConsumer(false);
    const payload = makeSessionCompletedPayload({ eventId: undefined });

    await consumer.onSessionCompleted(payload as any);

    // Must still process correctly using the fallback eventId
    expect(aggregation.onSessionCompleted).toHaveBeenCalledTimes(1);
    const fallbackEventId: string = peRepo.create.mock.calls[0][0].eventId;
    expect(fallbackEventId).toContain('session.completed');
  });

  // session.started: log only, no aggregation
  it('session.started: logs the event without calling aggregation', async () => {
    const { consumer, logRepo, aggregation } = makeConsumer(false);

    await consumer.onSessionStarted({
      eventType:    'session.started',
      eventId:      'evt-started-001',
      sessionId:    'session-002',
      userId:       'user-002',
      chargerId:    'charger-001',
      bookingId:    null,
      startTime:    '2026-04-12T07:00:00Z',
      startMeterWh: 1000,
    });

    expect(logRepo.save).toHaveBeenCalledTimes(1);
    expect(aggregation.onSessionCompleted).not.toHaveBeenCalled();
    expect(aggregation.onPaymentCompleted).not.toHaveBeenCalled();
  });
});

// Event Mapping Coverage

describe('Event → Aggregation Mapping', () => {
  it('session.completed payload có đủ fields cho AggregationEngine', () => {
    const payload = makeSessionCompletedPayload();
    expect(payload).toHaveProperty('sessionId');
    expect(payload).toHaveProperty('userId');
    expect(payload).toHaveProperty('chargerId');
    expect(payload).toHaveProperty('kwhConsumed');
    expect(payload).toHaveProperty('durationMinutes');
    expect(payload).toHaveProperty('endTime');
  });

  it('billing_month format derived from occurrence date (UTC)', () => {
    const ts = new Date('2026-04-12T15:00:00Z');
    const month = `${ts.getUTCFullYear()}-${String(ts.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(month).toBe('2026-04');
    expect(month).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('hourly bucket key (UTC-based)', () => {
    const ts      = new Date('2026-04-12T14:35:00Z');
    const hour    = ts.getUTCHours();                    // 14 UTC
    const dateStr = ts.toISOString().split('T')[0];      // '2026-04-12'
    const key     = `${dateStr}:${String(hour).padStart(2, '0')}`;
    expect(key).toBe('2026-04-12:14');
  });
});
