import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration V2 — Analytics Service
 *
 * Thêm các tables mới cho analytics engine đầy đủ:
 * - hourly_usage_stats: granular time-series cho peak detection
 * - revenue_stats: monthly revenue aggregation per station
 * - user_behavior_stats: all-time user behavior summary
 * - booking_stats: booking funnel per station per day
 * - updated_at column cho daily_station_metrics
 */
export class AddAnalyticsTables1712650000000 implements MigrationInterface {
  name = 'AddAnalyticsTables1712650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── hourly_usage_stats ────────────────────────────────────────────────────
    // Candidate key: (station_id, hour_bucket) — không có partial/transitive dep
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hourly_usage_stats (
        id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id        UUID          NOT NULL,
        charger_id        UUID          NOT NULL,
        hour_bucket       TIMESTAMPTZ   NOT NULL,          -- truncated to hour
        hour_of_day       SMALLINT      NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
        sessions_count    INT           NOT NULL DEFAULT 0,
        kwh_consumed      DECIMAL(10,4) NOT NULL DEFAULT 0,
        total_duration_min DECIMAL(10,2) NOT NULL DEFAULT 0,
        updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        UNIQUE (station_id, hour_bucket)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_hus_station_bucket ON hourly_usage_stats (station_id, hour_bucket DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_hus_hour_of_day ON hourly_usage_stats (hour_of_day, hour_bucket DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_hus_recent ON hourly_usage_stats (hour_bucket DESC)
        WHERE hour_bucket >= NOW() - INTERVAL '90 days'
    `);

    // ── revenue_stats ─────────────────────────────────────────────────────────
    // Candidate key: (station_id, billing_month)
    // station_id nullable = platform-wide row
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS revenue_stats (
        id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id          UUID,                         -- NULL = platform-wide
        billing_month       CHAR(7)       NOT NULL,       -- 'YYYY-MM'
        total_revenue_vnd   BIGINT        NOT NULL DEFAULT 0,
        total_transactions  INT           NOT NULL DEFAULT 0,
        updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_rev_month_fmt CHECK (billing_month ~ '^\\d{4}-(0[1-9]|1[0-2])$'),
        UNIQUE (station_id, billing_month)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_rev_station_month ON revenue_stats (station_id, billing_month DESC)
        WHERE station_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_rev_platform_month ON revenue_stats (billing_month DESC)
        WHERE station_id IS NULL
    `);

    // ── user_behavior_stats ───────────────────────────────────────────────────
    // Candidate key: user_id (1 row per user, all-time totals)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_behavior_stats (
        id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           UUID          NOT NULL UNIQUE,
        total_sessions    INT           NOT NULL DEFAULT 0,
        total_kwh         DECIMAL(12,4) NOT NULL DEFAULT 0,
        total_duration_min DECIMAL(10,2) NOT NULL DEFAULT 0,
        avg_duration_min  DECIMAL(8,2)  NOT NULL DEFAULT 0,
        last_session_at   TIMESTAMPTZ,
        updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_ubs_sessions ON user_behavior_stats (total_sessions DESC)
    `);

    // ── booking_stats ─────────────────────────────────────────────────────────
    // Candidate key: (station_id, metric_date)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_stats (
        id                  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id          UUID  NOT NULL,
        metric_date         DATE  NOT NULL,
        bookings_created    INT   NOT NULL DEFAULT 0,
        bookings_confirmed  INT   NOT NULL DEFAULT 0,
        bookings_cancelled  INT   NOT NULL DEFAULT 0,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (station_id, metric_date)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_bks_station_date ON booking_stats (station_id, metric_date DESC)
    `);

    // ── Add updated_at to daily_station_metrics (if missing) ─────────────────
    await queryRunner.query(`
      ALTER TABLE daily_station_metrics
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS booking_stats CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_behavior_stats CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS revenue_stats CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS hourly_usage_stats CASCADE`);
    await queryRunner.query(`
      ALTER TABLE daily_station_metrics DROP COLUMN IF EXISTS updated_at
    `);
  }
}
