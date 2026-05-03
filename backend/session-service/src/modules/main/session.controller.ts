import {
  Controller, Get, Post, Patch, Body, Param, Query,
  HttpCode, HttpStatus, ParseUUIDPipe, NotFoundException,
  BadRequestException, Logger, UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  StartSessionUseCase, StopSessionUseCase,
  RecordTelemetryUseCase, GetSessionUseCase,
} from '../../application/use-cases/session.use-cases';
import {
  StartSessionDto,
  StopSessionDto,
  RecordTelemetryDto,
} from '../../application/dtos/session.dto';
import { JwtAuthGuard }             from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }               from '../../shared/guards/roles.guard';
import { ChargingArrearsGuard, SkipChargingArrearsCheck } from '../../shared/guards/charging-arrears.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser }   from '../../shared/guards/jwt-auth.guard';
import * as jwt from 'jsonwebtoken';

/**
 * SessionController â€” MÃ´ hÃ¬nh tá»± phá»¥c vá»¥ (self-service kiosk):
 *
 *   POST /start              â†’ @JwtAuthGuard  (user tá»± báº¯t Ä‘áº§u sáº¡c táº¡i kiosk)
 *   POST /stop/:id           â†’ @JwtAuthGuard  (user tá»± dá»«ng sáº¡c táº¡i kiosk)
 *
 *   --- Can thiá»‡p sá»± cá»‘ (chá»‰ Admin/Staff) ---
 *   POST /admin/stop/:id     â†’ @Roles('staff','admin')  (ngáº¯t báº¯t buá»™c khi sá»± cá»‘)
 *   POST /telemetry/:id      â†’ @Roles('staff','admin')  (charger gá»­i telemetry thá»§ cÃ´ng)
 *
 *   --- Xem Ä‘á»c ---
 *   GET  /session/:id        â†’ @JwtAuthGuard             (user xem session cá»§a mÃ¬nh)
 *   GET  /charger/:id/active â†’ @Roles('staff','admin')  (staff kiá»ƒm tra charger)
 *   GET  /history            â†’ @JwtAuthGuard             (user xem lá»‹ch sá»­)
 */
@Controller('charging')
@UseGuards(JwtAuthGuard, RolesGuard, ChargingArrearsGuard)
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(
    private readonly startSession:    StartSessionUseCase,
    private readonly stopSession:     StopSessionUseCase,
    private readonly recordTelemetry: RecordTelemetryUseCase,
    private readonly getSession:      GetSessionUseCase,
  ) {}

  // â”€â”€â”€ Self-service: User tá»± khá»Ÿi Ä‘á»™ng sáº¡c táº¡i kiosk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * POST /api/v1/charging/start
   *
   * Luá»“ng 1 â€” CÃ³ Ä‘áº·t lá»‹ch trÆ°á»›c:
   *   Kiosk quÃ©t QR tá»« app â†’ gá»­i { chargerId, bookingId, qrToken }.
   *   Há»‡ thá»‘ng verify qrToken (JWT ngáº¯n háº¡n) chá»©a bookingId vÃ  userId.
   *   Náº¿u há»£p lá»‡ â†’ start session.
   *
   * Luá»“ng 2 â€” Walk-in (khÃ´ng Ä‘áº·t lá»‹ch):
   *   Kiosk gá»­i { chargerId } dá»±a vÃ o JWT cá»§a user.
   *   Há»‡ thá»‘ng tá»± Ä‘á»™ng start session.
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async start(
    @Body() dto: StartSessionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    // Luá»“ng cÃ³ booking: xÃ¡c minh QR token trÆ°á»›c
    if (dto.bookingId) {
      if (!dto.qrToken) {
        throw new BadRequestException(
          'qrToken lÃ  báº¯t buá»™c khi cÃ³ bookingId (Ä‘áº·t lá»‹ch trÆ°á»›c).',
        );
      }
      this.verifyQrToken(dto.qrToken, dto.bookingId, currentUser.id);
    }

    return this.startSession.execute({
      userId:       currentUser.id,           // luÃ´n tá»« JWT
      chargerId:    dto.chargerId,
      bookingId:    dto.bookingId,
      startMeterWh: dto.startMeterWh,
    });
  }

  /**
   * POST /api/v1/charging/stop/:id
   *
   * User tá»± dá»«ng sáº¡c táº¡i kiosk.
   * Há»‡ thá»‘ng kiá»ƒm tra session thuá»™c vá» user nÃ y trÆ°á»›c khi cho phÃ©p dá»«ng.
   */
  @Post('stop/:id')
  @HttpCode(HttpStatus.OK)
  async stop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StopSessionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    // Ownership check: chá»‰ chá»§ sá»Ÿ há»¯u session má»›i Ä‘Æ°á»£c dá»«ng
    const session = await this.getSession.execute(id);
    if (!session) throw new NotFoundException('Session khÃ´ng tá»“n táº¡i');
    if (session.userId !== currentUser.id) {
      throw new UnauthorizedException('Báº¡n khÃ´ng cÃ³ quyá»n dá»«ng session nÃ y');
    }

    return this.stopSession.execute({
      sessionId:  id,
      endMeterWh: dto.endMeterWh,
      reason:     dto.reason,
    });
  }

  // â”€â”€â”€ Admin/Staff: Can thiá»‡p khi sá»± cá»‘ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * POST /api/v1/charging/admin/stop/:id
   * Admin/Staff báº¯t buá»™c ngáº¯t session khi sá»± cá»‘ táº¡i tráº¡m (khÃ´ng cáº§n ownership).
   * @SkipChargingArrearsCheck: admin cÃ³ thá»ƒ dá»«ng session ká»ƒ cáº£ khi bá»‹ ná»£.
   */
  @Post('admin/stop/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('staff', 'admin')
  @SkipChargingArrearsCheck()
  async adminStop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StopSessionDto,
  ) {
    return this.stopSession.execute({
      sessionId:  id,
      endMeterWh: dto.endMeterWh,
      reason:     dto.reason ?? 'admin_intervention',
    });
  }

  /**
   * POST /api/v1/charging/telemetry/:id
   * Staff/charger firmware gá»­i dá»¯ liá»‡u telemetry thá»§ cÃ´ng.
   */
  @Post('telemetry/:id')
  @HttpCode(HttpStatus.CREATED)
  @Roles('staff', 'admin')
  @SkipChargingArrearsCheck()
  async telemetry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordTelemetryDto,
  ) {
    return this.recordTelemetry.execute(id, dto);
  }

  // â”€â”€â”€ Read endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * GET /api/v1/charging/session/:id
   * User xem session cá»§a mÃ¬nh.
   */
  @Get('session/:id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const session = await this.getSession.execute(id);
    if (!session) throw new NotFoundException('Session khÃ´ng tá»“n táº¡i');
    return session;
  }

  /**
   * GET /api/v1/charging/charger/:chargerId/active
   * Staff xem session Ä‘ang active cá»§a charger.
   */
  @Get('charger/:chargerId/active')
  @Roles('staff', 'admin')
  async getActiveByCharger(@Param('chargerId', ParseUUIDPipe) chargerId: string) {
    const session = await this.getSession.getActiveByCharger(chargerId);
    if (!session) throw new NotFoundException('KhÃ´ng cÃ³ session active cho charger nÃ y');
    return session;
  }

  /**
   * GET /api/v1/charging/history
   * User xem lá»‹ch sá»­ sáº¡c cá»§a mÃ¬nh.
   * @SkipChargingArrearsCheck: user ná»£ váº«n Ä‘Æ°á»£c xem lá»‹ch sá»­.
   */
  @Get('history')
  @SkipChargingArrearsCheck()
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    return this.getSession.getUserHistory(user.id, limit ?? 20);
  }

  // â”€â”€â”€ Private helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * XÃ¡c minh QR token do app táº¡o khi booking.
   * QR token lÃ  JWT ngáº¯n háº¡n (15 phÃºt) chá»©a payload: { bookingId, userId }.
   * Äáº£m báº£o:
   *   - Token há»£p lá»‡ vÃ  chÆ°a háº¿t háº¡n.
   *   - bookingId trong token khá»›p vá»›i bookingId trong request.
   *   - userId trong token khá»›p vá»›i user Ä‘ang Ä‘Äƒng nháº­p (cá»§a JWT chÃ­nh).
   */
  private verifyQrToken(qrToken: string, bookingId: string, callerId: string): void {
    const secret = process.env.QR_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'qr-secret';
    let payload: any;
    try {
      payload = jwt.verify(qrToken, secret);
    } catch {
      throw new BadRequestException('MÃ£ QR khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.');
    }
    if (payload.bookingId !== bookingId) {
      throw new BadRequestException('MÃ£ QR khÃ´ng khá»›p vá»›i booking nÃ y.');
    }
    if (payload.userId !== callerId) {
      throw new UnauthorizedException('MÃ£ QR khÃ´ng thuá»™c vá» tÃ i khoáº£n hiá»‡n táº¡i.');
    }
  }
}
