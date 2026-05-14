import {
  Controller, Get, Query, Param,
  ParseUUIDPipe, ParseIntPipe,
  DefaultValuePipe, ParseBoolPipe,
  Logger, UseGuards,
} from '@nestjs/common';
import {
  GetStationUsageUseCase,
  GetRevenueUseCase,
  GetPeakHoursUseCase,
  GetSystemMetricsUseCase,
  GetUserBehaviorUseCase,
  DashboardUseCase,
} from '../../application/use-cases/analytics.use-cases';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';

/**
 * AnalyticsController — Admin Reporting API
 *
 * Routes (prefix: /api/v1/analytics):
 *
 *   GET /system                              — Platform KPI dashboard
 *   GET /revenue?range=monthly&stationId=   — Revenue analytics
 *   GET /usage?stationId=&days=             — Station usage metrics
 *   GET /peak-hours?stationId=&forecast=    — Peak hour analysis + demand forecast
 *   GET /users/:userId?days=                — User behavior analytics
 *
 * Authorization: Admin only — Analytics data is restricted to administrative roles.
 */
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly systemMetrics: GetSystemMetricsUseCase,
    private readonly revenue:       GetRevenueUseCase,
    private readonly stationUsage:  GetStationUsageUseCase,
    private readonly peakHours:     GetPeakHoursUseCase,
    private readonly userBehavior:  GetUserBehaviorUseCase,
    private readonly dashboard:     DashboardUseCase,
  ) {}

  /**
   * Platform-wide KPI: active sessions, revenue 30d, booking funnel, top users.
   *
   * @example GET /api/v1/analytics/system
   */
  @Get('system')
  async getSystemMetrics() {
    this.logger.log('GET /analytics/system');
    return this.systemMetrics.execute();
  }

  /**
   * Revenue analytics.
   *
   * @param range       'monthly' | 'daily' (default: 'monthly')
   * @param stationId   UUID — filter by station (optional)
   * @param days        Number of days (only applicable if range=daily, default: 30)
   *
   * @example GET /api/v1/analytics/revenue?range=monthly
   * @example GET /api/v1/analytics/revenue?range=daily&stationId=xxx&days=7
   */
  @Get('revenue')
  async getRevenue(
    @Query('range')     range:     string  = 'monthly',
    @Query('stationId') stationId: string | undefined,
    @Query('days',  new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    if (range !== 'monthly' && range !== 'daily') {
      return { error: "Range must be either 'monthly' or 'daily'" };
    }
    return this.revenue.execute({ range, stationId, days });
  }

  /**
   * Station usage analytics.
   *
   * @param stationId  UUID — if not provided, returns top 10 stations
   * @param days       Recent number of days (default: 30)
   *
   * @example GET /api/v1/analytics/usage?stationId=xxx&days=14
   * @example GET /api/v1/analytics/usage
   */
  @Get('usage')
  async getUsage(
    @Query('stationId') stationId: string | undefined,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.stationUsage.execute({ stationId, days });
  }

  /**
   * Peak hour detection + demand forecast.
   *
   * @param stationId    UUID — filter by station (optional, default: platform-wide)
   * @param lookbackDays Historical analysis window in days (default: 28)
   * @param forecast     true — include EWA demand forecast for tomorrow
   *
   * @example GET /api/v1/analytics/peak-hours?stationId=xxx&forecast=true
   * @example GET /api/v1/analytics/peak-hours?lookbackDays=14
   */
  @Get('peak-hours')
  async getPeakHours(
    @Query('stationId')    stationId:    string | undefined,
    @Query('lookbackDays', new DefaultValuePipe(28), ParseIntPipe) lookbackDays: number,
    @Query('forecast',     new DefaultValuePipe(false), ParseBoolPipe) withForecast: boolean,
  ) {
    return this.peakHours.execute({ stationId, lookbackDays, withForecast });
  }

  /**
   * User behavior analytics.
   *
   * @param userId  User UUID
   * @param days    Recent number of days for daily breakdown (default: 30)
   *
   * @example GET /api/v1/analytics/users/abc-uuid?days=90
   */
  @Get('users/:userId')
  async getUserBehavior(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.userBehavior.execute(userId, days);
  }

  /**
   * Convenience shorthand: per-station summary (alias for usage with stationId).
   */
  @Get('stations/:stationId/metrics')
  async getStationMetrics(
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.stationUsage.execute({ stationId, days });
  }

  /**
   * Dashboard shortcut API: composite view for admin dashboard.
   *
   * Returns in one call:
   *   - latestKpi:   most recent platform KPI snapshot
   *   - revenue30d:  daily revenue (last 30 days)
   *   - peakHours:   top-5 peak hours (last 28 days)
   *   - topStations: top-5 stations by session count (last 30 days)
   *
   * @example GET /api/v1/analytics/dashboard
   */
  @Get('dashboard')
  async getDashboard() {
    this.logger.log('GET /analytics/dashboard');
    return this.dashboard.execute();
  }
}
