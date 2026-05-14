import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

// event_log
// Append-only log of all incoming events. Aggregation is not performed here.

@Entity('event_log')
@Index('idx_elog_type_time', ['eventType', 'receivedAt'])
@Index('idx_elog_user_time', ['userId', 'receivedAt'])
export class EventLogOrmEntity {
  @PrimaryColumn('uuid')                                              id: string;
  @Column({ name: 'event_type',     length: 100 })                   eventType: string;
  @Column({ name: 'source_service', length: 50 })                    sourceService: string;
  @Column({ name: 'aggregate_id',   type: 'uuid', nullable: true })  aggregateId: string | null;
  @Column({ name: 'user_id',        type: 'uuid', nullable: true })  userId: string | null;
  @Column({ type: 'jsonb', default: '{}' })                          payload: object;
  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })    receivedAt: Date;
}

// daily_station_metrics
// BCNF: (station_id, metric_date) -> {sessions, kwh, revenue, avg_duration, utilization}
// Candidate key: (station_id, metric_date)
// Incremental upsert from session.completed and payment.completed events.

@Entity('daily_station_metrics')
@Index('idx_dsm_station_date', ['stationId', 'metricDate'])
@Index('idx_dsm_date',         ['metricDate'])
export class DailyStationMetricsOrmEntity {
  @PrimaryColumn('uuid')                                                      id: string;
  @Column({ name: 'station_id',         type: 'uuid' })                      stationId: string;
  @Column({ name: 'metric_date',         type: 'date' })                      metricDate: Date;
  @Column({ name: 'total_sessions',      default: 0 })                        totalSessions: number;
  @Column({ name: 'total_kwh',           type: 'decimal', precision: 12, scale: 4, default: 0 }) totalKwh: number;
  @Column({ name: 'total_revenue_vnd',   type: 'bigint', default: 0 })        totalRevenueVnd: number;
  @Column({ name: 'avg_session_min',     type: 'decimal', precision: 8, scale: 2, default: 0 }) avgSessionMin: number;
  @Column({ name: 'utilization_rate',    type: 'decimal', precision: 5, scale: 4, default: 0 }) utilizationRate: number;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })              updatedAt: Date;
}

// hourly_usage_stats
// BCNF: (station_id, hour_bucket) -> {sessions, kwh, duration}
// Time-series table for peak hour detection. Avoids full recomputation.
// hour_bucket = truncated to hour (e.g., '2026-04-12 14:00:00+07')

@Entity('hourly_usage_stats')
@Index('idx_hus_station_bucket', ['stationId', 'hourBucket'])
@Index('idx_hus_hour_of_day',    ['hourOfDay', 'hourBucket'])
export class HourlyUsageStatsOrmEntity {
  @PrimaryColumn('uuid')                                                          id: string;
  @Column({ name: 'station_id',          type: 'uuid' })                          stationId: string;
  @Column({ name: 'charger_id',          type: 'uuid' })                          chargerId: string;
  @Column({ name: 'hour_bucket',         type: 'timestamptz' })                   hourBucket: Date;
  @Column({ name: 'hour_of_day',         type: 'smallint' })                      hourOfDay: number;
  @Column({ name: 'sessions_count',      default: 0 })                            sessionsCount: number;
  @Column({ name: 'kwh_consumed',        type: 'decimal', precision: 10, scale: 4, default: 0 }) kwhConsumed: number;
  @Column({ name: 'total_duration_min',  type: 'decimal', precision: 10, scale: 2, default: 0 }) totalDurationMin: number;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })                  updatedAt: Date;
}

// revenue_stats
// BCNF: (station_id, billing_month) -> {total_revenue, transactions}
// billing_month format: 'YYYY-MM' (stored as VARCHAR)
// Nullable station_id = platform-wide aggregation

@Entity('revenue_stats')
@Index('idx_rev_station_month', ['stationId', 'billingMonth'])
@Index('idx_rev_month',         ['billingMonth'])
export class RevenueStatsOrmEntity {
  @PrimaryColumn('uuid')                                                      id: string;
  @Column({ name: 'station_id',          type: 'uuid', nullable: true })     stationId: string | null;
  @Column({ name: 'billing_month',       length: 7 })                        billingMonth: string;    // 'YYYY-MM'
  @Column({ name: 'total_revenue_vnd',   type: 'bigint', default: 0 })       totalRevenueVnd: number;
  @Column({ name: 'total_transactions',  default: 0 })                       totalTransactions: number;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })             updatedAt: Date;
}

// user_behavior_stats
// BCNF: user_id -> {all-time total sessions, kwh, avg_duration, last_session_at}
// 1 row per user, incremental update

@Entity('user_behavior_stats')
@Index('idx_ubs_user', ['userId'])
export class UserBehaviorStatsOrmEntity {
  @PrimaryColumn('uuid')                                                           id: string;
  @Column({ name: 'user_id',           type: 'uuid', unique: true })              userId: string;
  @Column({ name: 'total_sessions',    default: 0 })                              totalSessions: number;
  @Column({ name: 'total_kwh',         type: 'decimal', precision: 12, scale: 4, default: 0 }) totalKwh: number;
  @Column({ name: 'total_duration_min',type: 'decimal', precision: 10, scale: 2, default: 0 }) totalDurationMin: number;
  @Column({ name: 'avg_duration_min',  type: 'decimal', precision: 8, scale: 2, default: 0 })  avgDurationMin: number;
  @Column({ name: 'last_session_at',   type: 'timestamptz', nullable: true })     lastSessionAt: Date | null;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })                  updatedAt: Date;
}

// booking_stats
// BCNF: (station_id, metric_date) -> {created, confirmed, cancelled}

@Entity('booking_stats')
@Index('idx_bks_station_date', ['stationId', 'metricDate'])
export class BookingStatsOrmEntity {
  @PrimaryColumn('uuid')                                                        id: string;
  @Column({ name: 'station_id',           type: 'uuid' })                      stationId: string;
  @Column({ name: 'metric_date',          type: 'date' })                       metricDate: Date;
  @Column({ name: 'bookings_created',     default: 0 })                         bookingsCreated: number;
  @Column({ name: 'bookings_confirmed',   default: 0 })                         bookingsConfirmed: number;
  @Column({ name: 'bookings_cancelled',   default: 0 })                         bookingsCancelled: number;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })                updatedAt: Date;
}

// daily_user_metrics
// Inherited from V1 — incremental per-user per-day.

@Entity('daily_user_metrics')
@Index('idx_dum_user_date', ['userId', 'metricDate'])
export class DailyUserMetricsOrmEntity {
  @PrimaryColumn('uuid')                                                           id: string;
  @Column({ name: 'user_id',            type: 'uuid' })                           userId: string;
  @Column({ name: 'metric_date',        type: 'date' })                            metricDate: Date;
  @Column({ name: 'sessions_count',     default: 0 })                              sessionsCount: number;
  @Column({ name: 'kwh_consumed',       type: 'decimal', precision: 10, scale: 4, default: 0 }) kwhConsumed: number;
  @Column({ name: 'amount_spent_vnd',   type: 'bigint', default: 0 })             amountSpentVnd: number;
}

// platform_kpi_snapshots
// Hourly system-wide snapshot

@Entity('platform_kpi_snapshots')
@Index('idx_kpi_captured', ['capturedAt'])
export class KpiSnapshotOrmEntity {
  @PrimaryColumn('uuid')                                                              id: string;
  @Column({ name: 'captured_at',           type: 'timestamptz' })                    capturedAt: Date;
  @Column({ length: 20 })                                                             period: string;
  @Column({ name: 'active_sessions',       default: 0 })                             activeSessions: number;
  @Column({ name: 'total_chargers',        default: 0 })                             totalChargers: number;
  @Column({ name: 'available_chargers',    default: 0 })                             availableChargers: number;
  @Column({ name: 'bookings_last_hour',    default: 0 })                             bookingsLastHour: number;
  @Column({ name: 'revenue_last_hour_vnd', type: 'bigint', default: 0 })             revenueLastHourVnd: number;
}

// processed_events (idempotency guard)

@Entity('processed_events')
export class ProcessedEventOrmEntity {
  @PrimaryColumn({ name: 'event_id', length: 255 })                eventId: string;
  @Column({ name: 'event_type', length: 100 })                     eventType: string;
  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' }) processedAt: Date;
}
