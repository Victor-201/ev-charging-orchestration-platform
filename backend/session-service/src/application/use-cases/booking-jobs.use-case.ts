import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';
import { IEventBus, EVENT_BUS } from '../../infrastructure/messaging/event-bus.interface';
import { Booking } from '../../domain/aggregates/booking.aggregate';

// ─── Auto Expire Bookings Job ─────────────────────────────────────────────────

/**
 * Chạy mỗi 1 phút:
 * - Tìm tất cả booking PENDING_PAYMENT quá 5 phút → expire
 * - Không có tiền cọc để refund (chưa thanh toán)
 * - Trigger process queue cho các charger bị giải phóng
 */
@Injectable()
export class AutoExpireBookingsJob {
  private readonly logger = new Logger(AutoExpireBookingsJob.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('* * * * *') // mỗi 1 phút
  async run(): Promise<void> {
    const holdMs = Booking.PAYMENT_HOLD_MINUTES * 60_000;
    const cutoff = new Date(Date.now() - holdMs);
    const expired = await this.bookingRepo.findPendingPaymentBefore(cutoff);

    if (expired.length === 0) return;

    this.logger.log(`Auto-expiring ${expired.length} PENDING_PAYMENT bookings`);

    for (const booking of expired) {
      await this.dataSource.transaction(async (manager) => {
        booking.expire();
        await this.bookingRepo.save(booking, manager);
        await this.eventBus.publishAll(booking.domainEvents, manager);
        booking.clearDomainEvents();
      });
    }

    this.logger.log(`Expired ${expired.length} bookings (no deposit to refund)`);
  }
}

// ─── No-Show Detection Job ────────────────────────────────────────────────────

/**
 * Chạy mỗi 1 phút:
 * - Tìm CONFIRMED bookings có startTime đã qua > 10 phút mà không có active session
 * → mark as NO_SHOW
 * → Emit BookingNoShowEvent với penaltyAmount + refundAmount
 * → Payment Service nhận event → trừ phạt 20%, hoàn 80% còn lại vào ví
 */
@Injectable()
export class NoShowDetectionJob {
  private readonly logger = new Logger(NoShowDetectionJob.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('* * * * *') // mỗi 1 phút
  async run(): Promise<void> {
    const graceMs = Booking.NO_SHOW_GRACE_MINUTES * 60_000;
    const cutoff  = new Date(Date.now() - graceMs);

    const candidates = await this.bookingRepo.findConfirmedStartedBefore(cutoff);

    if (candidates.length === 0) return;

    this.logger.log(`No-show check: ${candidates.length} confirmed bookings past grace period`);

    for (const booking of candidates) {
      await this.dataSource.transaction(async (manager) => {
        booking.markNoShow();
        await this.bookingRepo.save(booking, manager);
        await this.eventBus.publishAll(booking.domainEvents, manager);
        booking.clearDomainEvents();
      });

      this.logger.warn(
        `NO_SHOW: booking=${booking.id} user=${booking.userId} ` +
        `penalty=${booking.penaltyAmount}VND refund=${(booking.depositAmount ?? 0) - (booking.penaltyAmount ?? 0)}VND`,
      );
    }
  }
}

// ─── Get Queue Position Use Case ──────────────────────────────────────────────

@Injectable()
export class GetQueuePositionUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(userId: string, chargerId: string): Promise<{
    position: number;
    estimatedWaitMinutes: number;
    userId: string;
    chargerId: string;
  }> {
    const position = await this.bookingRepo.getQueuePosition(userId, chargerId);
    return {
      position,
      estimatedWaitMinutes: position * 45, // avg 45min/session
      userId,
      chargerId,
    };
  }
}
