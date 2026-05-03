import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';

import {
  DailyStationMetricsOrmEntity,
  DailyUserMetricsOrmEntity,
  KpiSnapshotOrmEntity,
  UserBehaviorStatsOrmEntity,
  RevenueStatsOrmEntity,
  HourlyUsageStatsOrmEntity,
  BookingStatsOrmEntity,
  EventLogOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/analytics.orm-entities';
import { PeakHourDetector } from '../../domain/services/peak-hour-detector';
import { AggregationEngine } from '../../domain/services/aggregation.engine';

// Re-export cho AppModule
export {
  EventLogOrmEntity, DailyStationMetricsOrmEntity, DailyUserMetricsOrmEntity,
  KpiSnapshotOrmEntity, UserBehaviorStatsOrmEntity, RevenueStatsOrmEntity,
  HourlyUsageStatsOrmEntity, BookingStatsOrmEntity,
};

// ─── GetStationUsageUseCase ───────────────────────────────────────────────────

/**
 * GET /analytics/usage?stationId=&days=
 *
 * Trả về daily station metrics cho N ngày gần nhất.
 * Nếu không có stationId → top 10 stations theo total_sessions.
 */
@Injectable()
export class GetStationUsageUseCase {
  constructor(
    @InjectRepository(DailyStationMetricsOrmEntity)
    private readonly repo: Repository<DailyStationMetricsOrmEntity>,
    private readonly ds: DataSource,
  ) {}

  async execute(params: {
    stationId?: string;
    days?:      number;
    from?:      string;
    to?:        string;
  }) {
    const days = params.days ?? 30;

    if (params.stationId) {
      // Per-station: N ngày gần nhất
      const rows = await this.repo.find({
        where:  { stationId: params.stationId },
        order:  { metricDate: 'DESC' },
        take:   days,
      });

      const summary = rows.reduce(
        (acc, r) => ({
          totalSessions:   acc.totalSessions + r.totalSessions,
          totalKwh:        acc.totalKwh      + Number(r.totalKwh),
          totalRevenueVnd: acc.totalRevenueVnd + Number(r.totalRevenueVnd),
        }),
        { totalSessions: 0, totalKwh: 0, totalRevenueVnd: 0 },
      );

      return {
        stationId: params.stationId,
        days,
        summary,
        daily: rows,
      };
    }

    // Platform-wide top 10
    const rows = await this.ds.query(`
      SELECT
        station_id,
        SUM(total_sessions)     AS total_sessions,
        SUM(total_kwh)          AS total_kwh,
        SUM(total_revenue_vnd)  AS total_revenue_vnd,
        ROUND(AVG(avg_session_min), 2) AS avg_session_min
      FROM daily_station_metrics
      WHERE metric_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY station_id
      ORDER BY total_sessions DESC
      LIMIT 10
    `);

    return { days, topStations: rows };
  }
}

// ─── GetRevenueUseCase ────────────────────────────────────────────────────────

/**
 * GET /analytics/revenue?range=monthly|daily&stationId=&month=
 */
@Injectable()
export class GetRevenueUseCase {
  constructor(
    @InjectRepository(RevenueStatsOrmEntity)
    private readonly revenueRepo: Repository<RevenueStatsOrmEntity>,
    @InjectRepository(DailyStationMetricsOrmEntity)
    private readonly dsm: Repository<DailyStationMetricsOrmEntity>,
    private readonly ds: DataSource,
  ) {}

  async execute(params: {
    range?:     'monthly' | 'daily';
    stationId?: string;
    month?:     string;   // 'YYYY-MM'
    days?:      number;
  }) {
    const range = params.range ?? 'monthly';

    if (range === 'monthly') {
      // Monthly revenue từ revenue_stats
      const where = params.stationId
        ? `WHERE station_id = '${params.stationId}'`
        : `WHERE station_id IS NULL`;

      const rows = await this.ds.query(`
        SELECT
          billing_month,
          SUM(total_revenue_vnd)   AS total_revenue_vnd,
          SUM(total_transactions)  AS total_transactions
        FROM revenue_stats
        ${where}
        GROUP BY billing_month
        ORDER BY billing_month DESC
        LIMIT 12
      `);

      const totalRevenue = rows.reduce(
        (sum: number, r: any) => sum + parseInt(r.total_revenue_vnd || '0'), 0,
      );

      return { range: 'monthly', stationId: params.stationId ?? 'platform', totalRevenue, monthly: rows };
    }

    // Daily revenue từ daily_station_metrics
    const days = params.days ?? 30;
    const stationFilter = params.stationId
      ? `AND station_id = '${params.stationId}'`
      : '';

    const rows = await this.ds.query(`
      SELECT
        metric_date,
        SUM(total_revenue_vnd)  AS total_revenue_vnd,
        SUM(total_sessions)     AS total_sessions
      FROM daily_station_metrics
      WHERE metric_date >= CURRENT_DATE - INTERVAL '${days} days'
        ${stationFilter}
      GROUP BY metric_date
      ORDER BY metric_date DESC
    `);

    const totalRevenue = rows.reduce(
      (sum: number, r: any) => sum + parseInt(r.total_revenue_vnd || '0'), 0,
    );

    return { range: 'daily', stationId: params.stationId ?? 'platform', period: `${days}d`, totalRevenue, daily: rows };
  }
}

// ─── GetPeakHoursUseCase ──────────────────────────────────────────────────────

/**
 * GET /analytics/peak-hours?stationId=&lookbackDays=&forecast=true
 */
@Injectable()
export class GetPeakHoursUseCase {
  constructor(private readonly peakDetector: PeakHourDetector) {}

  async execute(params: {
    stationId?:    string;
    lookbackDays?: number;
    withForecast?: boolean;
  }) {
    const lookback = params.lookbackDays ?? 28;

    const peakHours = params.stationId
      ? await this.peakDetector.detectForStation(params.stationId, lookback)
      : await this.peakDetector.detectPlatformWide(lookback);

    const result: any = {
      stationId:    params.stationId ?? 'platform',
      lookbackDays: lookback,
      peakHours,
      topPeakHours: peakHours.filter((h) => h.isPeak).map((h) => h.hourOfDay),
    };

    if (params.withForecast && params.stationId) {
      result.forecast = await this.peakDetector.forecastNextDay(params.stationId);
    }

    return result;
  }
}

// ─── GetSystemMetricsUseCase ──────────────────────────────────────────────────

/**
 * GET /analytics/system
 *
 * Platform-wide KPI: active sessions, total revenue, booking funnel, top users.
 */
@Injectable()
export class GetSystemMetricsUseCase {
  constructor(
    @InjectRepository(KpiSnapshotOrmEntity)
    private readonly kpiRepo: Repository<KpiSnapshotOrmEntity>,
    private readonly ds: DataSource,
  ) {}

  async execute() {
    const [latestKpi, sessionStats, revenueStats, bookingStats, topUsers] =
      await Promise.all([
        // Latest hourly KPI snapshot
        this.kpiRepo.findOne({ order: { capturedAt: 'DESC' } }),

        // Total sessions (30 days)
        this.ds.query(`
          SELECT
            SUM(total_sessions)    AS total_sessions_30d,
            SUM(total_kwh)         AS total_kwh_30d,
            ROUND(AVG(avg_session_min), 2) AS avg_session_min
          FROM daily_station_metrics
          WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
        `),

        // Total revenue (30 days)
        this.ds.query(`
          SELECT SUM(total_revenue_vnd) AS total_revenue_30d
          FROM daily_station_metrics
          WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
        `),

        // Booking funnel (7 days)
        this.ds.query(`
          SELECT
            SUM(bookings_created)    AS created_7d,
            SUM(bookings_confirmed)  AS confirmed_7d,
            SUM(bookings_cancelled)  AS cancelled_7d
          FROM booking_stats
          WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
        `),

        // Top 5 users by sessions (30 days)
        this.ds.query(`
          SELECT
            user_id,
            SUM(sessions_count)    AS sessions,
            SUM(kwh_consumed)      AS total_kwh,
            SUM(amount_spent_vnd)  AS total_spent_vnd
          FROM daily_user_metrics
          WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY user_id
          ORDER BY sessions DESC
          LIMIT 5
        `),
      ]);

    const session = sessionStats[0] ?? {};
    const revenue = revenueStats[0] ?? {};
    const booking = bookingStats[0] ?? {};
    const confirmRate = booking.created_7d > 0
      ? Math.round((booking.confirmed_7d / booking.created_7d) * 100)
      : 0;
    const cancelRate = booking.created_7d > 0
      ? Math.round((booking.cancelled_7d / booking.created_7d) * 100)
      : 0;

    return {
      capturedAt:     new Date(),
      kpiSnapshot:    latestKpi ?? null,
      last30Days: {
        totalSessions:   parseInt(session.total_sessions_30d ?? '0'),
        totalKwh:        parseFloat(session.total_kwh_30d ?? '0'),
        avgSessionMin:   parseFloat(session.avg_session_min ?? '0'),
        totalRevenueVnd: parseInt(revenue.total_revenue_30d ?? '0'),
      },
      bookingFunnel7d: {
        created:      parseInt(booking.created_7d   ?? '0'),
        confirmed:    parseInt(booking.confirmed_7d ?? '0'),
        cancelled:    parseInt(booking.cancelled_7d ?? '0'),
        confirmRate:  `${confirmRate}%`,
        cancelRate:   `${cancelRate}%`,
      },
      topUsers,
    };
  }
}

// ─── GetUserBehaviorUseCase ───────────────────────────────────────────────────

/**
 * GET /analytics/users/:userId
 */
@Injectable()
export class GetUserBehaviorUseCase {
  constructor(
    @InjectRepository(UserBehaviorStatsOrmEntity)
    private readonly behaviorRepo: Repository<UserBehaviorStatsOrmEntity>,
    @InjectRepository(DailyUserMetricsOrmEntity)
    private readonly dailyRepo: Repository<DailyUserMetricsOrmEntity>,
  ) {}

  async execute(userId: string, days = 30) {
    const [behavior, daily] = await Promise.all([
      this.behaviorRepo.findOneBy({ userId }),
      this.dailyRepo.find({
        where: { userId },
        order: { metricDate: 'DESC' },
        take:  days,
      }),
    ]);

    return {
      userId,
      allTime:     behavior ?? null,
      last30Days:  daily,
    };
  }
}

// ─── KpiCaptureJob ────────────────────────────────────────────────────────────

/**
 * Cron: mỗi giờ chụp KPI snapshot từ event_log.
 * Không cần external call — hoàn toàn từ analytics DB.
 */
@Injectable()
export class KpiCaptureJob {
  private readonly logger = new Logger(KpiCaptureJob.name);

  constructor(
    private readonly aggregation: AggregationEngine,
    private readonly ds: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async captureHourlyKpi(): Promise<void> {
    try {
      const [activeSessions, bookingsLastHour, revenueLastHour] = await Promise.all([
        this.ds.query(`
          SELECT COUNT(*) AS cnt FROM event_log
          WHERE event_type = 'session.started'
            AND received_at >= NOW() - INTERVAL '1 hour'
        `),
        this.ds.query(`
          SELECT COUNT(*) AS cnt FROM event_log
          WHERE event_type = 'booking.created'
            AND received_at >= NOW() - INTERVAL '1 hour'
        `),
        this.ds.query(`
          SELECT COALESCE(SUM((payload->>'amount')::BIGINT), 0) AS total
          FROM event_log
          WHERE event_type = 'payment.completed'
            AND received_at >= NOW() - INTERVAL '1 hour'
        `),
      ]);

      await this.aggregation.captureKpiSnapshot({
        activeSessions:     parseInt(activeSessions[0]?.cnt ?? '0'),
        totalChargers:      0,
        availableChargers:  0,
        bookingsLastHour:   parseInt(bookingsLastHour[0]?.cnt ?? '0'),
        revenueLastHourVnd: parseInt(revenueLastHour[0]?.total ?? '0'),
      });

      this.logger.log('Hourly KPI snapshot captured');
    } catch (err: any) {
      this.logger.error(`KPI capture failed: ${err.message}`);
    }
  }
}

// ─── DashboardUseCase ─────────────────────────────────────────────────────────

/**
 * GET /analytics/dashboard
 *
 * Composite shortcut API: aggregates KPI + revenue + peak hours in a single call.
 * Designed for admin dashboard — avoids N separate calls from the frontend.
 *
 * Returns:
 *  - latestKpi:      most recent KPI snapshot
 *  - revenue30d:     daily revenue for the last 30 days (platform-wide)
 *  - peakHours:      top-5 peak hours platform-wide (last 28 days)
 *  - topStations:    top 5 stations by session count (last 30 days)
 */
@Injectable()
export class DashboardUseCase {
  private readonly logger = new Logger(DashboardUseCase.name);

  constructor(
    @InjectRepository(KpiSnapshotOrmEntity)
    private readonly kpiRepo: Repository<KpiSnapshotOrmEntity>,
    @InjectRepository(DailyStationMetricsOrmEntity)
    private readonly stationMetricsRepo: Repository<DailyStationMetricsOrmEntity>,
    private readonly ds: DataSource,
    private readonly peakDetector: PeakHourDetector,
  ) {}

  async execute() {
    const [latestKpi, topStations, peakHours, revenueRows] = await Promise.all([
      // Latest KPI snapshot
      this.kpiRepo.findOne({ order: { capturedAt: 'DESC' } }),

      // Top 5 stations by total sessions (last 30 days)
      this.ds.query(`
        SELECT
          station_id,
          SUM(total_sessions)    AS total_sessions,
          SUM(total_kwh)         AS total_kwh,
          SUM(total_revenue_vnd) AS total_revenue_vnd
        FROM daily_station_metrics
        WHERE metric_date >= NOW() - INTERVAL '30 days'
        GROUP BY station_id
        ORDER BY total_sessions DESC
        LIMIT 5
      `),

      // Platform-wide peak hours (last 28 days)
      this.peakDetector.detectPlatformWide(28),

      // Daily revenue last 30 days
      this.ds.query(`
        SELECT
          metric_date,
          SUM(total_revenue_vnd) AS revenue_vnd,
          SUM(total_sessions)    AS sessions
        FROM daily_station_metrics
        WHERE metric_date >= NOW() - INTERVAL '30 days'
        GROUP BY metric_date
        ORDER BY metric_date DESC
      `),
    ]);

    return {
      latestKpi: latestKpi ?? null,
      revenue30d: revenueRows.map((r: any) => ({
        date:       r.metric_date,
        revenueVnd: parseInt(r.revenue_vnd ?? '0'),
        sessions:   parseInt(r.sessions ?? '0'),
      })),
      peakHours: peakHours.slice(0, 5),
      topStations: topStations.map((s: any) => ({
        stationId:      s.station_id,
        totalSessions:  parseInt(s.total_sessions ?? '0'),
        totalKwh:       parseFloat(s.total_kwh ?? '0'),
        totalRevenueVnd: parseInt(s.total_revenue_vnd ?? '0'),
      })),
    };
  }
}

// ─── MaterializedViewRefreshJob ───────────────────────────────────────────────

/**
 * Cron: refresh materialized views mỗi 15 phút.
 *
 * Materialized views được tạo trong migration cho hiệu suất query analytics.
 * PostgreSQL REFRESH MATERIALIZED VIEW CONCURRENTLY không block reads.
 *
 * Views refreshed:
 *  - mv_daily_station_summary  — pre-aggregated per station per day
 *  - mv_hourly_demand          — pre-aggregated demand per hour
 */
@Injectable()
export class MaterializedViewRefreshJob {
  private readonly logger = new Logger(MaterializedViewRefreshJob.name);

  constructor(private readonly ds: DataSource) {}

  @Cron('0 */15 * * * *') // every 15 minutes
  async refresh(): Promise<void> {
    const views = ['mv_daily_station_summary', 'mv_hourly_demand'];
    for (const view of views) {
      try {
        await this.ds.query(
          `REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`,
        );
        this.logger.debug(`Refreshed materialized view: ${view}`);
      } catch (err: any) {
        // View may not exist yet (pre-data) — log and continue
        this.logger.warn(`Could not refresh ${view}: ${err.message}`);
      }
    }
  }
}

