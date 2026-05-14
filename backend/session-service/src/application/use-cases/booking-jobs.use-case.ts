import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';
import { IEventBus, EVENT_BUS } from '../../infrastructure/messaging/event-bus.interface';
import { Booking } from '../../domain/aggregates/booking.aggregate';

// Auto Expire Bookings Job

/**
 * Runs every 1 minute:
 * - Find all PENDING_PAYMENT bookings older than 5 minutes -> expire
 * - No deposit to refund (unpaid)
 * - Trigger process queue for freed chargers
 */
@Injectable()
export class AutoExpireBookingsJob {
  private readonly logger = new Logger(AutoExpireBookingsJob.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('* * * * *') // every 1 minute
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

// No-Show Detection Job

/**
 * Runs every 1 minute:
 * - Find CONFIRMED bookings with startTime past > 10 minutes without active session
 * -> mark as NO_SHOW
 * -> Emit BookingNoShowEvent with penaltyAmount + refundAmount
 * -> Payment Service receives event -> deduct 20% penalty, refund remaining 80% to wallet
 */
@Injectable()
export class NoShowDetectionJob {
  private readonly logger = new Logger(NoShowDetectionJob.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('* * * * *') // every 1 minute
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

// Get Queue Position Use Case

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
