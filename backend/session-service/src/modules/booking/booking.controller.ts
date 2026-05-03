import {
  Controller,
  Post, Get, Delete,
  Body, Param, Query,
  HttpCode, HttpStatus,
  ParseUUIDPipe, NotFoundException,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { CreateBookingUseCase, GetAvailabilityUseCase } from '../../application/use-cases/create-booking.use-case';
import { CancelBookingUseCase } from '../../application/use-cases/booking-lifecycle.use-case';
import { GetQueuePositionUseCase } from '../../application/use-cases/booking-jobs.use-case';
import {
  JoinQueueUseCase,
  LeaveQueueUseCase,
} from '../../application/use-cases/queue.use-case';
import { CreateBookingDto, CancelBookingDto, JoinQueueDto, AvailabilityQueryDto } from '../../application/dtos/booking.dto';
import { BookingResponseDto, AvailabilitySlotDto, QueuePositionResponseDto } from '../../application/dtos/response.dto';
import { Booking } from '../../domain/aggregates/booking.aggregate';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { ArrearsGuard, SkipArrearsCheck } from '../../shared/guards/arrears.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/guards/jwt-auth.guard';
import { BOOKING_REPOSITORY } from './booking.tokens';
import type { IBookingRepository } from '../../domain/repositories/booking.repository.interface';

/**
 * BookingController â€” Tá»± Ä‘á»™ng hÃ³a hoÃ n toÃ n, khÃ´ng cáº§n nhÃ¢n viÃªn thÆ°á»ng trá»±c
 *
 * Luá»“ng:
 *   POST /bookings         â†’ Táº¡o booking (PENDING_PAYMENT) + emit deposit request
 *   GET  /bookings/availability â†’ Xem lá»‹ch trá»‘ng theo ngÃ y / trá»¥
 *   GET  /bookings/:id     â†’ Chi tiáº¿t booking (kÃ¨m QR token náº¿u Ä‘Ã£ confirm)
 *   GET  /bookings/me      â†’ Lá»‹ch Ä‘áº·t cá»§a user hiá»‡n táº¡i
 *   DELETE /bookings/:id   â†’ Há»§y booking â†’ tá»± Ä‘á»™ng hoÃ n tiá»n cá»c vá» vÃ­
 *
 *   POST /queue            â†’ ÄÄƒng kÃ½ hÃ ng Ä‘á»£i (khi trá»¥ full)
 *   DELETE /queue/:chargerId â†’ Rá»i hÃ ng Ä‘á»£i
 *   GET  /queue/:chargerId/position â†’ Vá»‹ trÃ­ trong hÃ ng Ä‘á»£i
 *
 * NOTE: confirm/complete endpoints Ä‘Ã£ bá»‹ XÃ“A.
 *   Confirm: tá»± Ä‘á»™ng sau khi payment.completed event nháº­n Ä‘Æ°á»£c.
 *   Complete: tá»± Ä‘á»™ng sau khi session.started event nháº­n Ä‘Æ°á»£c.
 */
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard, ArrearsGuard)
export class BookingController {
  constructor(
    private readonly createBooking:       CreateBookingUseCase,
    private readonly cancelBooking:        CancelBookingUseCase,
    private readonly getAvailability:      GetAvailabilityUseCase,
    private readonly joinQueue:            JoinQueueUseCase,
    private readonly leaveQueue:           LeaveQueueUseCase,
    private readonly getQueuePosition:     GetQueuePositionUseCase,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo:          IBookingRepository,
  ) {}

  // â”€â”€â”€ GET /api/v1/bookings/availability â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * Xem lá»‹ch trá»‘ng/báº­n theo ngÃ y cho má»™t trá»¥ sáº¡c.
   * Tráº£ vá» máº£ng slot 30 phÃºt, má»—i slot cÃ³ isBooked: true/false.
   * @SkipArrearsCheck: user Ä‘ang ná»£ váº«n cÃ³ thá»ƒ XEM lá»‹ch (chá»‰ cháº·n Ä‘áº·t má»›i).
   */
  @Get('availability')
  @SkipArrearsCheck()
  async getAvailabilitySlots(
    @Query() query: AvailabilityQueryDto,
    @Query('stationId') stationId?: string,
    @Query('connectorType') connectorType?: string,
  ) {
    const date = new Date(query.date);
    return this.getAvailability.execute(
      query.chargerId,
      stationId ?? '',
      connectorType ?? '',
      date,
    );
  }

  // â”€â”€â”€ GET /api/v1/bookings/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * Lá»‹ch Ä‘áº·t cá»§a user hiá»‡n táº¡i â€” phÃ¢n trang.
   * @SkipArrearsCheck: user Ä‘ang ná»£ váº«n cÃ³ thá»ƒ XEM lá»‹ch Ä‘áº·t cÅ©.
   */
  @Get('me')
  @SkipArrearsCheck()
  async getMyBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<{ items: BookingResponseDto[]; total: number }> {
    const result = await this.bookingRepo.findByUser(user.id, +limit, +offset);
    return {
      items: result.items.map((b) => this.toDto(b)),
      total: result.total,
    };
  }

  // â”€â”€â”€ POST /api/v1/bookings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * Táº¡o booking má»›i.
   * userId láº¥y tá»« JWT token (khÃ´ng cho client tá»± set).
   * Sau khi táº¡o: há»‡ thá»‘ng tá»± Ä‘á»™ng trá»« tiá»n cá»c tá»« vÃ­.
   * Náº¿u thanh toÃ¡n thÃ nh cÃ´ng: booking tá»± Ä‘á»™ng CONFIRMED + QR Ä‘Æ°á»£c sinh.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookingResponseDto> {
    const booking = await this.createBooking.execute({
      userId:        user.id,
      chargerId:     dto.chargerId,
      stationId:     dto.stationId,
      connectorType: dto.connectorType,
      startTime:     new Date(dto.startTime),
      endTime:       new Date(dto.endTime),
      // depositAmount Ä‘Ã£ bá»‹ xÃ³a khá»i DTO â€” backend tá»± tÃ­nh tá»« station-service
    });
    return this.toDto(booking);
  }

  // â”€â”€â”€ GET /api/v1/bookings/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * Chi tiáº¿t booking â€” user thÆ°á»ng chá»‰ xem booking cá»§a mÃ¬nh.
   * Response kÃ¨m qrToken (null náº¿u chÆ°a confirm).
   * @SkipArrearsCheck: user Ä‘ang ná»£ váº«n cÃ³ thá»ƒ xem chi tiáº¿t booking cÅ©.
   */
  @Get(':id')
  @SkipArrearsCheck()
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) throw new NotFoundException(`Booking ${id} khÃ´ng tá»“n táº¡i`);

    const isPrivileged = user.roles?.some((r) => ['admin', 'staff'].includes(r));
    if (!isPrivileged && booking.userId !== user.id) {
      throw new NotFoundException(`Booking ${id} khÃ´ng tá»“n táº¡i`);
    }
    return this.toDto(booking);
  }

  // â”€â”€â”€ DELETE /api/v1/bookings/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * User tá»± há»§y booking.
   * Tiá»n cá»c sáº½ Ä‘Æ°á»£c hoÃ n 100% vÃ o vÃ­ tá»± Ä‘á»™ng sau khi event Ä‘Æ°á»£c xá»­ lÃ½.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.cancelBooking.execute({
      bookingId: id,
      userId:    user.id,
      reason:    dto.reason ?? 'User cancelled',
    });
  }

  // â”€â”€â”€ Queue endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * POST /api/v1/bookings/queue
   * ÄÄƒng kÃ½ vÃ o hÃ ng Ä‘á»£i khi trá»¥ Ä‘ang full.
   * Khi cÃ³ slot trá»‘ng, há»‡ thá»‘ng sáº½ Push Notification cho user.
   */
  @Post('queue')
  @HttpCode(HttpStatus.CREATED)
  async handleJoinQueue(
    @Body() dto: JoinQueueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QueuePositionResponseDto> {
    return this.joinQueue.execute({
      userId:        user.id,
      chargerId:     dto.chargerId,
      connectorType: dto.connectorType,
      userPriority:  1,
      urgencyScore:  dto.urgencyScore ?? 0,
    });
  }

  /**
   * DELETE /api/v1/bookings/queue/:chargerId
   * Rá»i hÃ ng Ä‘á»£i.
   */
  @Delete('queue/:chargerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async handleLeaveQueue(
    @Param('chargerId', ParseUUIDPipe) chargerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.leaveQueue.execute({ userId: user.id, chargerId });
  }

  /**
   * GET /api/v1/bookings/queue/:chargerId/position
   * Xem vá»‹ trÃ­ trong hÃ ng Ä‘á»£i.
   */
  @Get('queue/:chargerId/position')
  async getQueuePos(
    @Param('chargerId', ParseUUIDPipe) chargerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QueuePositionResponseDto> {
    return this.getQueuePosition.execute(user.id, chargerId);
  }

  // â”€â”€â”€ Mapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private toDto(b: Booking): BookingResponseDto {
    return {
      id:              b.id,
      userId:          b.userId,
      chargerId:       b.chargerId,
      startTime:       b.timeRange.startTime,
      endTime:         b.timeRange.endTime,
      status:          b.status,
      durationMinutes: b.timeRange.durationMinutes(),
      qrToken:         b.qrToken,
      depositAmount:   b.depositAmount,
      createdAt:       b.createdAt,
    };
  }
}
