/**
 * Tests: AggregationEngine — incremental upsert logic
 *
 * Mocks DataSource to test SQL logic patterns without a physical database.
 * Verifies: correct SQL parameters and ON CONFLICT idempotency behavior.
 */
import { AggregationEngine } from '../../src/domain/services/aggregation.engine';

// Mock DataSource

function makeMockDs(overrides?: Partial<any>) {
  const mockManager = {
    query: jest.fn().mockResolvedValue([]),
  };
  return {
    transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockManager)),
    query:       jest.fn().mockResolvedValue([]),
    _manager:    mockManager,   // exposed for assertions
  };
}

import { Logger } from '@nestjs/common';

describe('AggregationEngine', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  let engine: AggregationEngine;
  let mockDs: ReturnType<typeof makeMockDs>;

  beforeEach(() => {
    mockDs = makeMockDs();
    engine = new AggregationEngine(mockDs as any);
  });

  // onSessionCompleted

  describe('onSessionCompleted', () => {
    const baseParams = {
      sessionId:       'session-001',
      stationId:       'station-001',
      chargerId:       'charger-001',
      userId:          'user-001',
      kwhConsumed:     15.5,
      durationMinutes: 90,
      occurredAt:      new Date('2026-04-12T14:30:00Z'),
    };

    it('executes within a transaction', async () => {
      await engine.onSessionCompleted(baseParams);
      expect(mockDs.transaction).toHaveBeenCalledTimes(1);
    });

    it('updates 4 tables when stationId is provided', async () => {
      await engine.onSessionCompleted(baseParams);
      const mgr = mockDs._manager;
      // daily_station_metrics, hourly_usage_stats, daily_user_metrics, user_behavior_stats
      expect(mgr.query).toHaveBeenCalledTimes(4);
    });

    it('updates only 2 tables when stationId is null (skips station and hourly tables)', async () => {
      await engine.onSessionCompleted({ ...baseParams, stationId: null });
      const mgr = mockDs._manager;
      // only daily_user_metrics and user_behavior_stats
      expect(mgr.query).toHaveBeenCalledTimes(2);
    });

    it('passes correct kwhConsumed parameters to SQL', async () => {
      await engine.onSessionCompleted(baseParams);
      const mgr = mockDs._manager;
      // 1st call: daily_station_metrics
      const [firstSql, firstParams] = mgr.query.mock.calls[0];
      expect(firstSql).toContain('daily_station_metrics');
      expect(firstParams).toContain('station-001');
      expect(firstParams).toContain(15.5); // kwhConsumed
    });

    it('SQL contains ON CONFLICT DO UPDATE for idempotency', async () => {
      await engine.onSessionCompleted(baseParams);
      const mgr = mockDs._manager;
      const allSql = mgr.query.mock.calls.map(([sql]: [string]) => sql).join('\n');
      expect(allSql).toContain('ON CONFLICT');
      expect(allSql).toContain('DO UPDATE');
    });

    it('daily user metrics receives the correct userId', async () => {
      await engine.onSessionCompleted(baseParams);
      const mgr = mockDs._manager;
      // 3rd call: daily_user_metrics
      const [, params] = mgr.query.mock.calls[2];
      expect(params).toContain('user-001');
      expect(params).toContain(15.5);
    });
  });

  // onPaymentCompleted

  describe('onPaymentCompleted', () => {
    const baseParams = {
      transactionId: 'tx-001',
      userId:        'user-001',
      amountVnd:     250000,
      stationId:     'station-001',
      bookingId:     'booking-001',
      occurredAt:    new Date('2026-04-12T15:00:00Z'),
    };

    it('executes within a transaction', async () => {
      await engine.onPaymentCompleted(baseParams);
      expect(mockDs.transaction).toHaveBeenCalledTimes(1);
    });

    it('updates 3 tables when stationId is provided', async () => {
      await engine.onPaymentCompleted(baseParams);
      const mgr = mockDs._manager;
      expect(mgr.query).toHaveBeenCalledTimes(3); // revenue_stats, daily_station_metrics, and daily_user_metrics
    });

    it('updates only 2 tables when stationId is null', async () => {
      await engine.onPaymentCompleted({ ...baseParams, stationId: null });
      const mgr = mockDs._manager;
      expect(mgr.query).toHaveBeenCalledTimes(2); // global revenue_stats and daily_user_metrics
    });

    it('revenue_stats receives the correct billing_month format', async () => {
      await engine.onPaymentCompleted(baseParams);
      const mgr = mockDs._manager;
      const [, params] = mgr.query.mock.calls[0]; // revenue_stats là call đầu tiên
      // billing_month must be in 'YYYY-MM' format
      const billingMonth = params.find((p: any) => typeof p === 'string' && /^\d{4}-\d{2}$/.test(p));
      expect(billingMonth).toBe('2026-04');
    });

    it('VND amount is passed correctly to revenue_stats', async () => {
      await engine.onPaymentCompleted(baseParams);
      const mgr = mockDs._manager;
      const [, params] = mgr.query.mock.calls[0];
      expect(params).toContain(250000);
    });
  });

  // onBookingEvent

  describe('onBookingEvent', () => {
    it('booking.created: updates booking_stats.bookings_created', async () => {
      await engine.onBookingEvent({
        eventType:  'booking.created',
        bookingId:  'b-001',
        stationId:  'station-001',
        userId:     'user-001',
        occurredAt: new Date('2026-04-12T10:00:00Z'),
      });
      expect(mockDs.query).toHaveBeenCalledTimes(2); // INSERT followed by UPDATE
      const updateSql: string = mockDs.query.mock.calls[1][0];
      expect(updateSql).toContain('bookings_created');
      expect(updateSql).toContain('+ 1');
    });

    it('booking.cancelled: updates bookings_cancelled', async () => {
      await engine.onBookingEvent({
        eventType:  'booking.cancelled',
        bookingId:  'b-002',
        stationId:  'station-001',
        userId:     'user-001',
        occurredAt: new Date('2026-04-12T11:00:00Z'),
      });
      const updateSql: string = mockDs.query.mock.calls[1][0];
      expect(updateSql).toContain('bookings_cancelled');
    });

    it('stationId null: skips updates', async () => {
      await engine.onBookingEvent({
        eventType:  'booking.created',
        bookingId:  'b-003',
        stationId:  null,
        userId:     'user-001',
        occurredAt: new Date(),
      });
      expect(mockDs.query).not.toHaveBeenCalled();
    });
  });

  // captureKpiSnapshot

  describe('captureKpiSnapshot', () => {
    it('inserts into platform_kpi_snapshots with correct parameters', async () => {
      await engine.captureKpiSnapshot({
        activeSessions:     5,
        totalChargers:      20,
        availableChargers:  15,
        bookingsLastHour:   3,
        revenueLastHourVnd: 500000,
      });
      expect(mockDs.query).toHaveBeenCalledTimes(1);
      const [sql, params] = mockDs.query.mock.calls[0];
      expect(sql).toContain('platform_kpi_snapshots');
      expect(params).toContain(5);   // activeSessions
      expect(params).toContain(500000); // revenueLastHourVnd
    });
  });
});
