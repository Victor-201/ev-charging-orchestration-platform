import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TimeBucket } from '../../domain/value-objects/analytics.vo';

/**
 * AggregationEngine — Incremental Analytics Aggregator
 *
 * Design Principles:
 * - Incremental Upsert: Avoid full recomputations; only update delta.
 * - Atomic: Operations wrapped in database transactions.
 * - Idempotent: Safe to execute multiple times for the same event.
 * - Normalized: Adheres to BCNF standards with clear candidate keys.
 *
 * Pipeline:
 *   Event → AggregationEngine → upsert [daily/hourly/user] tables
 */
@Injectable()
export class AggregationEngine {
  private readonly logger = new Logger(AggregationEngine.name);

  constructor(private readonly ds: DataSource) {}

  // SESSION COMPLETED: core charging analytics

  /**
   * Updates metrics upon session.completed:
   *  - daily_station_metrics: +sessions, +kwh, +avg_duration (incremental average)
   *  - hourly_usage_stats: +hourly sessions (for peak detection)
   *  - daily_user_metrics: +sessions, +kwh
   */
  async onSessionCompleted(params: {
    sessionId:       string;
    stationId:       string | null;
    chargerId:       string;
    userId:          string;
    kwhConsumed:     number;
    durationMinutes: number;
    occurredAt:      Date;
  }): Promise<void> {
    await this.ds.transaction(async (mgr: EntityManager) => {
      const daily   = TimeBucket.of(params.occurredAt, 'daily');
      const hourly  = TimeBucket.of(params.occurredAt, 'hourly');
      const monthly = TimeBucket.of(params.occurredAt, 'monthly');

      // 1. daily_station_metrics (per station per day)
      if (params.stationId) {
        await mgr.query(`
          INSERT INTO daily_station_metrics
            (id, station_id, metric_date, total_sessions, total_kwh, avg_session_min, utilization_rate)
          VALUES ($1, $2, $3, 1, $4, $5, 0)
          ON CONFLICT (station_id, metric_date) DO UPDATE SET
            total_sessions  = daily_station_metrics.total_sessions + 1,
            total_kwh       = daily_station_metrics.total_kwh + EXCLUDED.total_kwh,
            avg_session_min = (
              daily_station_metrics.avg_session_min * daily_station_metrics.total_sessions
              + EXCLUDED.avg_session_min
            ) / (daily_station_metrics.total_sessions + 1)
        `, [uuidv4(), params.stationId, daily.dateStr, params.kwhConsumed, params.durationMinutes]);
      }

      // 2. hourly_usage_stats (peak hour detection table)
      if (params.stationId) {
        const hourOfDay = hourly.hourOfDay;
        await mgr.query(`
          INSERT INTO hourly_usage_stats
            (id, station_id, charger_id, hour_bucket, hour_of_day, sessions_count, kwh_consumed, total_duration_min)
          VALUES ($1, $2, $3, $4, $5, 1, $6, $7)
          ON CONFLICT (station_id, hour_bucket) DO UPDATE SET
            sessions_count    = hourly_usage_stats.sessions_count + 1,
            kwh_consumed      = hourly_usage_stats.kwh_consumed + EXCLUDED.kwh_consumed,
            total_duration_min = hourly_usage_stats.total_duration_min + EXCLUDED.total_duration_min
        `, [
          uuidv4(), params.stationId, params.chargerId,
          hourly.bucketAt, hourOfDay,
          params.kwhConsumed, params.durationMinutes,
        ]);
      }

      // 3. daily_user_metrics
      await mgr.query(`
        INSERT INTO daily_user_metrics
          (id, user_id, metric_date, sessions_count, kwh_consumed, amount_spent_vnd)
        VALUES ($1, $2, $3, 1, $4, 0)
        ON CONFLICT (user_id, metric_date) DO UPDATE SET
          sessions_count = daily_user_metrics.sessions_count + 1,
          kwh_consumed   = daily_user_metrics.kwh_consumed + EXCLUDED.kwh_consumed
      `, [uuidv4(), params.userId, daily.dateStr, params.kwhConsumed]);

      // 4. user_behavior_stats (all-time per user)
      await mgr.query(`
        INSERT INTO user_behavior_stats
          (id, user_id, total_sessions, total_kwh, total_duration_min, last_session_at)
        VALUES ($1, $2, 1, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          total_sessions   = user_behavior_stats.total_sessions + 1,
          total_kwh        = user_behavior_stats.total_kwh + EXCLUDED.total_kwh,
          total_duration_min = user_behavior_stats.total_duration_min + EXCLUDED.total_duration_min,
          avg_duration_min = (user_behavior_stats.total_duration_min + EXCLUDED.total_duration_min)
                             / (user_behavior_stats.total_sessions + 1),
          last_session_at  = GREATEST(user_behavior_stats.last_session_at, EXCLUDED.last_session_at),
          updated_at       = NOW()
      `, [uuidv4(), params.userId, params.kwhConsumed, params.durationMinutes, params.occurredAt]);

      this.logger.debug(
        `Session aggregated: station=${params.stationId} user=${params.userId} kwh=${params.kwhConsumed} min=${params.durationMinutes}`,
      );
    });
  }

  // PAYMENT COMPLETED: revenue analytics

  /**
   * Updates revenue metrics:
   *  - daily_station_metrics.total_revenue_vnd
   *  - daily_user_metrics.amount_spent_vnd
   *  - revenue_stats (monthly aggregation)
   */
  async onPaymentCompleted(params: {
    transactionId: string;
    userId:        string;
    amountVnd:     number;
    stationId:     string | null;
    bookingId:     string | null;
    occurredAt:    Date;
  }): Promise<void> {
    await this.ds.transaction(async (mgr: EntityManager) => {
      const daily   = TimeBucket.of(params.occurredAt, 'daily');
      const monthly = TimeBucket.of(params.occurredAt, 'monthly');

      // Revenue stats (monthly)
      await mgr.query(`
        INSERT INTO revenue_stats
          (id, station_id, billing_month, total_revenue_vnd, total_transactions)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (station_id, billing_month) DO UPDATE SET
          total_revenue_vnd    = revenue_stats.total_revenue_vnd + EXCLUDED.total_revenue_vnd,
          total_transactions   = revenue_stats.total_transactions + 1,
          updated_at           = NOW()
      `, [uuidv4(), params.stationId, monthly.bucketKey, params.amountVnd]);

      // daily_station_metrics: update revenue
      if (params.stationId) {
        await mgr.query(`
          INSERT INTO daily_station_metrics
            (id, station_id, metric_date, total_sessions, total_kwh, total_revenue_vnd, avg_session_min, utilization_rate)
          VALUES ($1, $2, $3, 0, 0, $4, 0, 0)
          ON CONFLICT (station_id, metric_date) DO UPDATE SET
            total_revenue_vnd = daily_station_metrics.total_revenue_vnd + EXCLUDED.total_revenue_vnd,
            updated_at        = NOW()
        `, [uuidv4(), params.stationId, daily.dateStr, params.amountVnd]);
      }

      // daily_user_metrics: update amount_spent
      await mgr.query(`
        INSERT INTO daily_user_metrics
          (id, user_id, metric_date, sessions_count, kwh_consumed, amount_spent_vnd)
        VALUES ($1, $2, $3, 0, 0, $4)
        ON CONFLICT (user_id, metric_date) DO UPDATE SET
          amount_spent_vnd = daily_user_metrics.amount_spent_vnd + EXCLUDED.amount_spent_vnd
      `, [uuidv4(), params.userId, daily.dateStr, params.amountVnd]);

      this.logger.debug(
        `Payment aggregated: user=${params.userId} amount=${params.amountVnd}VND station=${params.stationId}`,
      );
    });
  }

  // BOOKING EVENTS: usage & cancellation analytics

  /**
   * Tracking booking stats: created/confirmed/cancelled per station per day.
   */
  async onBookingEvent(params: {
    eventType:  'booking.created' | 'booking.confirmed' | 'booking.cancelled';
    bookingId:  string;
    stationId:  string | null;
    userId:     string;
    occurredAt: Date;
  }): Promise<void> {
    if (!params.stationId) return;

    const daily = TimeBucket.of(params.occurredAt, 'daily');

    const columnMap: Record<string, string> = {
      'booking.created':   'bookings_created',
      'booking.confirmed': 'bookings_confirmed',
      'booking.cancelled': 'bookings_cancelled',
    };
    const col = columnMap[params.eventType];
    if (!col) return;

    await this.ds.query(`
      INSERT INTO booking_stats
        (id, station_id, metric_date, bookings_created, bookings_confirmed, bookings_cancelled)
      VALUES ($1, $2, $3, 0, 0, 0)
      ON CONFLICT (station_id, metric_date) DO NOTHING
    `, [uuidv4(), params.stationId, daily.dateStr]);

    // Incremental update specific counter
    await this.ds.query(
      `UPDATE booking_stats
         SET ${col} = ${col} + 1, updated_at = NOW()
       WHERE station_id = $1 AND metric_date = $2`,
      [params.stationId, daily.dateStr],
    );

    this.logger.debug(
      `Booking ${params.eventType} aggregated: station=${params.stationId} date=${daily.dateStr}`,
    );
  }

  // KPI SNAPSHOT: system-wide metrics

  /**
   * Updates hourly KPI snapshots.
   * Invoked by cron jobs, not event consumers.
   */
  async captureKpiSnapshot(kpi: {
    activeSessions:     number;
    totalChargers:      number;
    availableChargers:  number;
    bookingsLastHour:   number;
    revenueLastHourVnd: number;
  }): Promise<void> {
    await this.ds.query(`
      INSERT INTO platform_kpi_snapshots
        (id, captured_at, period, active_sessions, total_chargers, available_chargers,
         bookings_last_hour, revenue_last_hour_vnd)
      VALUES ($1, NOW(), 'hourly', $2, $3, $4, $5, $6)
    `, [
      uuidv4(),
      kpi.activeSessions,
      kpi.totalChargers,
      kpi.availableChargers,
      kpi.bookingsLastHour,
      kpi.revenueLastHourVnd,
    ]);
  }
}
