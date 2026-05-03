import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration V3 — Analytics Materialized Views
 *
 * Creates PostgreSQL materialized views for high-performance analytics queries.
 * Views are refreshed by MaterializedViewRefreshJob every 15 minutes (CONCURRENTLY).
 *
 * Views created:
 *  - mv_daily_station_summary: pre-aggregated daily metrics per station
 *  - mv_hourly_demand: pre-aggregated hourly demand patterns
 *
 * Requires UNIQUE index to support REFRESH CONCURRENTLY.
 */
export class AddMaterializedViews1712700000000 implements MigrationInterface {
  name = 'AddMaterializedViews1712700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── mv_daily_station_summary ──────────────────────────────────────────────
    // Aggregates daily_station_metrics into a summary view.
    // Supports fast dashboard and revenue queries.
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_station_summary AS
      SELECT
        station_id,
        DATE_TRUNC('day', metric_date)           AS summary_date,
        SUM(total_sessions)                       AS total_sessions,
        SUM(total_kwh)                            AS total_kwh,
        SUM(total_revenue_vnd)                    AS total_revenue_vnd,
        ROUND(AVG(avg_session_duration_min), 2)   AS avg_session_duration_min,
        MAX(updated_at)                           AS last_updated
      FROM daily_station_metrics
      GROUP BY station_id, DATE_TRUNC('day', metric_date)
      WITH DATA
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dss_station_date
        ON mv_daily_station_summary (station_id, summary_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_mv_dss_date
        ON mv_daily_station_summary (summary_date DESC)
    `);

    // ── mv_hourly_demand ──────────────────────────────────────────────────────
    // Pre-aggregates hourly usage patterns for peak hour detection.
    // Refreshed every 15 minutes; DON'T use for real-time queries.
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_demand AS
      SELECT
        station_id,
        hour_of_day,
        ROUND(AVG(sessions_count), 2)      AS avg_sessions,
        ROUND(AVG(kwh_consumed), 4)        AS avg_kwh,
        ROUND(AVG(total_duration_min), 2)  AS avg_duration_min,
        SUM(sessions_count)                AS total_sessions,
        COUNT(*)                           AS data_points,
        MAX(hour_bucket)                   AS latest_bucket
      FROM hourly_usage_stats
      WHERE hour_bucket >= NOW() - INTERVAL '90 days'
      GROUP BY station_id, hour_of_day
      WITH DATA
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_hd_station_hour
        ON mv_hourly_demand (station_id, hour_of_day)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_mv_hd_sessions
        ON mv_hourly_demand (avg_sessions DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS mv_hourly_demand CASCADE`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS mv_daily_station_summary CASCADE`);
  }
}
