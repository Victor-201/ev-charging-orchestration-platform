import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712600000000 implements MigrationInterface {
  name = 'InitialSchema1712600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Event log (all events captured for analytics — append-only) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS event_log (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type      VARCHAR(100) NOT NULL,
        source_service  VARCHAR(50) NOT NULL,
        aggregate_id    UUID,
        user_id         UUID,
        payload         JSONB NOT NULL DEFAULT '{}',
        received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_elog_type ON event_log (event_type, received_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_elog_user ON event_log (user_id, received_at DESC) WHERE user_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX idx_elog_received ON event_log (received_at DESC)`);

    // ─── Daily station metrics (materialized summary — BCNF: fully normalized) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_station_metrics (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id            UUID NOT NULL,
        metric_date           DATE NOT NULL,
        total_sessions        INT NOT NULL DEFAULT 0,
        total_kwh             DECIMAL(12,4) NOT NULL DEFAULT 0,
        total_revenue_vnd     BIGINT NOT NULL DEFAULT 0,
        avg_session_min       DECIMAL(8,2) NOT NULL DEFAULT 0,
        utilization_rate      DECIMAL(5,4) NOT NULL DEFAULT 0,
        UNIQUE (station_id, metric_date)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_dsm_station ON daily_station_metrics (station_id, metric_date DESC)`);
    await queryRunner.query(`CREATE INDEX idx_dsm_date ON daily_station_metrics (metric_date DESC)`);

    // ─── Daily user metrics ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_user_metrics (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL,
        metric_date      DATE NOT NULL,
        sessions_count   INT NOT NULL DEFAULT 0,
        kwh_consumed     DECIMAL(10,4) NOT NULL DEFAULT 0,
        amount_spent_vnd BIGINT NOT NULL DEFAULT 0,
        UNIQUE (user_id, metric_date)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_dum_user ON daily_user_metrics (user_id, metric_date DESC)`);

    // ─── Platform-wide KPI snapshots (hourly) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_kpi_snapshots (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        captured_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        period              VARCHAR(20) NOT NULL DEFAULT 'hourly',
        active_sessions     INT NOT NULL DEFAULT 0,
        total_chargers      INT NOT NULL DEFAULT 0,
        available_chargers  INT NOT NULL DEFAULT 0,
        bookings_last_hour  INT NOT NULL DEFAULT 0,
        revenue_last_hour_vnd BIGINT NOT NULL DEFAULT 0
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_kpi_time ON platform_kpi_snapshots (captured_at DESC, period)`);

    // ─── Processed events (idempotency) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id     VARCHAR(255) PRIMARY KEY,
        event_type   VARCHAR(100) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Seed some metrics from seeded sessions ───
    await queryRunner.query(`
      INSERT INTO daily_station_metrics (station_id, metric_date, total_sessions, total_kwh, total_revenue_vnd, avg_session_min, utilization_rate) VALUES
      ('b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '2 days', 12, 1450.5, 6090000, 72.5, 0.6800),
      ('b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 day', 15, 1820.0, 7644000, 68.0, 0.7500),
      ('b0000000-0000-0000-0000-000000000001', CURRENT_DATE, 8, 920.0, 3864000, 65.0, 0.4200),
      ('b0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '2 days', 18, 2100.0, 9450000, 75.0, 0.7200),
      ('b0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '1 day', 22, 2580.0, 11610000, 78.0, 0.8500),
      ('b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '1 day', 6, 620.0, 2542000, 55.0, 0.3800)
      ON CONFLICT (station_id, metric_date) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO daily_user_metrics (user_id, metric_date, sessions_count, kwh_consumed, amount_spent_vnd) VALUES
      ('a0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '2 days', 1, 145.0, 609000),
      ('a0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '1 day', 1, 230.0, 1035000),
      ('a0000000-0000-0000-0000-000000000004', CURRENT_DATE - INTERVAL '3 days', 1, 56.0, 237480),
      ('a0000000-0000-0000-0000-000000000007', CURRENT_DATE, 1, 180.0, 756000)
      ON CONFLICT (user_id, metric_date) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS processed_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS platform_kpi_snapshots CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS daily_user_metrics CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS daily_station_metrics CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS event_log CASCADE`);
  }
}
