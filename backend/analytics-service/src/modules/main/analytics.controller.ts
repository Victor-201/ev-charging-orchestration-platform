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
 * AnalyticsController Ã¢â‚¬â€ Admin Reporting API
 *
 * Routes (prefix: /api/v1/analytics):
 *
 *   GET /system                              Ã¢â‚¬â€ Platform KPI dashboard
 *   GET /revenue?range=monthly&stationId=   Ã¢â‚¬â€ Revenue analytics
 *   GET /usage?stationId=&days=             Ã¢â‚¬â€ Station usage metrics
 *   GET /peak-hours?stationId=&forecast=    Ã¢â‚¬â€ Peak hour analysis + demand forecast
 *   GET /users/:userId?days=                Ã¢â‚¬â€ User behavior analytics
 *
 * Authorization: Admin only Ã¢â‚¬â€ analytics data khÃƒÂ´ng expose vÃ¡Â»â€ºi user thÃ†Â°Ã¡Â»Âng.
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /api/v1/analytics/system Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /api/v1/analytics/revenue Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Revenue analytics.
   *
   * @param range       'monthly' | 'daily' (default: 'monthly')
   * @param stationId   UUID Ã¢â‚¬â€ lÃ¡Â»Âc theo station (optional)
   * @param days        N ngÃƒÂ y (chÃ¡Â»â€° ÃƒÂ¡p dÃ¡Â»Â¥ng khi range=daily, default: 30)
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
      return { error: "range phÃ¡ÂºÂ£i lÃƒÂ  'monthly' hoÃ¡ÂºÂ·c 'daily'" };
    }
    return this.revenue.execute({ range, stationId, days });
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /api/v1/analytics/usage Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Station usage analytics.
   *
   * @param stationId  UUID Ã¢â‚¬â€ nÃ¡ÂºÂ¿u khÃƒÂ´ng cÃƒÂ³ Ã¢â€ â€™ top 10 stations
   * @param days       N ngÃƒÂ y gÃ¡ÂºÂ§n nhÃ¡ÂºÂ¥t (default: 30)
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /api/v1/analytics/peak-hours Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Peak hour detection + demand forecast.
   *
   * @param stationId    UUID Ã¢â‚¬â€ lÃ¡Â»Âc theo station (optional, default: platform-wide)
   * @param lookbackDays SÃ¡Â»â€˜ ngÃƒÂ y lÃ¡Â»â€¹ch sÃ¡Â»Â­ phÃƒÂ¢n tÃƒÂ­ch (default: 28)
   * @param forecast     true Ã¢â€ â€™ include EWA demand forecast cho ngÃƒÂ y mai
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /api/v1/analytics/users/:userId Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * User behavior analytics.
   *
   * @param userId  UUID cÃ¡Â»Â§a user
   * @param days    N ngÃƒÂ y gÃ¡ÂºÂ§n nhÃ¡ÂºÂ¥t cho daily breakdown (default: 30)
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /api/v1/analytics/stations/:stationId/metrics Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Convenience shorthand: per-station summary (alias cho usage vá»›i stationId).
   */
  @Get('stations/:stationId/metrics')
  async getStationMetrics(
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.stationUsage.execute({ stationId, days });
  }

  // â”€â”€ GET /api/v1/analytics/dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


