/**
 * Tests: AggregationEngine — incremental upsert logic
 *
 * Mock DataSource để test SQL logic pattern (không cần DB).
 * Verify: correct SQL params, correct ON CONFLICT behavior.
 */
import { AggregationEngine } from '../../src/domain/services/aggregation.engine';

// ─── Mock DataSource ──────────────────────────────────────────────────────────

function makeMockDs(overrides?: Partial<any>) {
  const mockManager = {
    query: jest.fn().mockResolvedValue([]),
  };
  return {
    transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockManager)),
    query:       jest.fn().mockResolvedValue([]),
    _manager:    mockManager,   // expose for assertions
  };
}

describe('AggregationEngine', () => {
  let engine: AggregationEngine;
  let mockDs: ReturnType<typeof makeMockDs>;

  beforeEach(() => {
    mockDs = makeMockDs();
    engine = new AggregationEngine(mockDs as any);
  });

  // ── onSessionCompleted ────────────────────────────────────────────────────

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

    it('execute trong transaction', async () => {
      await engine.onSessionCompleted(baseParams);
      expect(mockDs.transaction).toHaveBeenCalledTimes(1);
    });

    it('cập nhật 4 tables khi có stationId', async () => {
      await engine.onSessionCompleted(baseParams);
      const mgr = mockDs._manager;
      // daily_station_metrics, hourly_usage_stats, daily_user_metrics, user_behavior_stats
      expect(mgr.query).toHaveBeenCalledTimes(4);
    });

    it('chỉ cập nhật 2 tables khi stationId = null (skip station/hourly tables)', async () => {
      await engine.onSessionCompleted({ ...baseParams, stationId: null });
      const mgr = mockDs._manager;
      // daily_user_metrics + user_behavior_stats chỉ
      expect(mgr.query).toHaveBeenCalledTimes(2);
    });

    it('pass đúng kwhConsumed params vào SQL', async () => {
      await engine.onSessionCompleted(baseParams);
      const mgr = mockDs._manager;
      // 1st call: daily_station_metrics
      const [firstSql, firstParams] = mgr.query.mock.calls[0];
      expect(firstSql).toContain('daily_station_metrics');
      expect(firstParams).toContain('station-001');
      expect(firstParams).toContain(15.5); // kwhConsumed
    });

    it('SQL chứa ON CONFLICT DO UPDATE cho idempotency', async () => {
      await engine.onSessionCompleted(baseParams);
      const mgr = mockDs._manager;
      const allSql = mgr.query.mock.calls.map(([sql]: [string]) => sql).join('\n');
      expect(allSql).toContain('ON CONFLICT');
      expect(allSql).toContain('DO UPDATE');
    });

    it('daily user metrics nhận đúng userId', async () => {
      await engine.onSessionCompleted(baseParams);
      const mgr = mockDs._manager;
      // 3rd call: daily_user_metrics
      const [, params] = mgr.query.mock.calls[2];
      expect(params).toContain('user-001');
      expect(params).toContain(15.5);
    });
  });

  // ── onPaymentCompleted ────────────────────────────────────────────────────

  describe('onPaymentCompleted', () => {
    const baseParams = {
      transactionId: 'tx-001',
      userId:        'user-001',
      amountVnd:     250000,
      stationId:     'station-001',
      bookingId:     'booking-001',
      occurredAt:    new Date('2026-04-12T15:00:00Z'),
    };

    it('execute trong transaction', async () => {
      await engine.onPaymentCompleted(baseParams);
      expect(mockDs.transaction).toHaveBeenCalledTimes(1);
    });

    it('cập nhật 3 tables khi có stationId', async () => {
      await engine.onPaymentCompleted(baseParams);
      const mgr = mockDs._manager;
      expect(mgr.query).toHaveBeenCalledTimes(3); // revenue_stats, daily_station_metrics, daily_user_metrics
    });

    it('chỉ cập nhật 2 tables khi stationId = null', async () => {
      await engine.onPaymentCompleted({ ...baseParams, stationId: null });
      const mgr = mockDs._manager;
      expect(mgr.query).toHaveBeenCalledTimes(2); // revenue_stats (global) + daily_user_metrics
    });

    it('revenue_stats nhận đúng billing_month format', async () => {
      await engine.onPaymentCompleted(baseParams);
      const mgr = mockDs._manager;
      const [, params] = mgr.query.mock.calls[0]; // revenue_stats là call đầu tiên
      // billing_month phải là 'YYYY-MM' format
      const billingMonth = params.find((p: any) => typeof p === 'string' && /^\d{4}-\d{2}$/.test(p));
      expect(billingMonth).toBe('2026-04');
    });

    it('amount VND được pass đúng vào revenue_stats', async () => {
      await engine.onPaymentCompleted(baseParams);
      const mgr = mockDs._manager;
      const [, params] = mgr.query.mock.calls[0];
      expect(params).toContain(250000);
    });
  });

  // ── onBookingEvent ────────────────────────────────────────────────────────

  describe('onBookingEvent', () => {
    it('booking.created → cập nhật booking_stats.bookings_created', async () => {
      await engine.onBookingEvent({
        eventType:  'booking.created',
        bookingId:  'b-001',
        stationId:  'station-001',
        userId:     'user-001',
        occurredAt: new Date('2026-04-12T10:00:00Z'),
      });
      expect(mockDs.query).toHaveBeenCalledTimes(2); // INSERT then UPDATE
      const updateSql: string = mockDs.query.mock.calls[1][0];
      expect(updateSql).toContain('bookings_created');
      expect(updateSql).toContain('+ 1');
    });

    it('booking.cancelled → cập nhật bookings_cancelled', async () => {
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

    it('stationId null → bỏ qua (không cập nhật)', async () => {
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

  // ── captureKpiSnapshot ────────────────────────────────────────────────────

  describe('captureKpiSnapshot', () => {
    it('insert vào platform_kpi_snapshots với đúng params', async () => {
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
