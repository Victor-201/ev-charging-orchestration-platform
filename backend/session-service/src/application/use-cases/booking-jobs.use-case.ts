import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';
import { IEventBus, EVENT_BUS } from '../../infrastructure/messaging/event-bus.interface';
import { Booking } from '../../domain/aggregates/booking.aggregate';
import {
  ChargerStateOrmEntity,
  OutboxOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/session.orm-entities';
import { ChargerReadModelOrmEntity } from '../../infrastructure/persistence/typeorm/entities/booking.orm-entities';

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
    @InjectRepository(ChargerStateOrmEntity)
    private readonly chargerStateRepo: Repository<ChargerStateOrmEntity>,
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
    @InjectRepository(ChargerReadModelOrmEntity)
    private readonly chargerRmRepo: Repository<ChargerReadModelOrmEntity>,
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

        // Release charger → available (no physical wait needed — charger was never occupied)
        // Do NOT set releasedAt because there's no physical car to wait for.
        const chargerRm = await this.chargerRmRepo.findOneBy({ chargerId: booking.chargerId });
        const stationId = chargerRm?.stationId ?? 'unknown';

        await manager.upsert(
          ChargerStateOrmEntity,
          {
            chargerId:       booking.chargerId,
            availability:    'available',
            activeSessionId: null,
            errorCode:       null,
            releasedAt:      null,
            updatedAt:       new Date(),
          },
          ['chargerId'],
        );

        // Emit charger.status.changed so station-service stays in sync
        const statusEventId = uuidv4();
        await manager.save(
          manager.create(OutboxOrmEntity, {
            id:            statusEventId,
            aggregateType: 'charger',
            aggregateId:   booking.chargerId,
            eventType:     'charger.status.changed',
            payload:       {
              eventId:   statusEventId,
              chargerId: booking.chargerId,
              stationId,
              newStatus: 'available',
              changedAt: new Date().toISOString(),
            },
            status:      'pending',
            processedAt: null,
          }),
        );
      });

      this.logger.warn(
        `NO_SHOW: booking=${booking.id} user=${booking.userId} ` +
        `penalty=${booking.penaltyAmount}VND ` +
        `refund=${(booking.depositAmount ?? 0) - (booking.penaltyAmount ?? 0)}VND ` +
        `→ charger ${booking.chargerId} released to available`,
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

// Booking Reminder Job (10 minutes before start)

@Injectable()
export class BookingReminderJob {
  private readonly logger = new Logger(BookingReminderJob.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
  ) {}

  @Cron('* * * * *') // every 1 minute
  async run(): Promise<void> {
    const now = Date.now();
    // Scan window: 10 minutes past start time (grace limit) to 15 minutes in the future (reminders start)
    const startLimit = new Date(now - 10 * 60_000);
    const endLimit = new Date(now + 15 * 60_000);

    const upcomingBookings = await this.bookingRepo.findConfirmedStartingBetween(startLimit, endLimit);

    if (upcomingBookings.length === 0) return;

    for (const booking of upcomingBookings) {
      // Find the latest reminder sent for this booking
      const latestReminder = await this.outboxRepo.findOne({
        where: {
          aggregateId: booking.id,
          eventType: 'booking.reminder.upcoming',
        },
        order: { createdAt: 'DESC' },
      });

      // Spacing: Cứ sau 5 phút thì thông báo 1 lần (use 4.5 minutes threshold to avoid rounding skips)
      if (latestReminder) {
        const timeSinceLast = now - latestReminder.createdAt.getTime();
        if (timeSinceLast < 4.5 * 60_000) {
          continue;
        }
      }

      // Calculate time remaining in minutes
      const diffMs = booking.timeRange.startTime.getTime() - now;
      const diffMin = Math.round(diffMs / 60_000);

      let customTitle = 'Upcoming Booking Reminder';
      let customBody = '';

      if (diffMin > 0) {
        customBody = `Your booking #${booking.id.slice(0, 8)} starts in ${diffMin} minutes. Please arrive on time!`;
      } else {
        // Negative diffMin means the booking already started. E.g., -3 minutes means 3 minutes past start.
        // Grace period is 10 minutes, so remainingGrace is 10 + diffMin (e.g. 10 - 3 = 7 minutes)
        const remainingGrace = Math.max(0, 10 + diffMin);
        if (remainingGrace === 0) {
          // If 10 minutes grace elapsed, it will be cancelled by NoShowDetectionJob, skip reminder
          continue;
        }
        customTitle = 'Check-in Grace Period Expiration';
        customBody = `Your booking has started! You have ${remainingGrace} minutes to check-in before it is cancelled.`;
      }

      this.logger.log(`Generating upcoming booking reminder for booking=${booking.id} user=${booking.userId} (diffMin=${diffMin})`);

      await this.dataSource.transaction(async (manager) => {
        const eventId = uuidv4();
        await manager.save(
          manager.create(OutboxOrmEntity, {
            id:            eventId,
            aggregateType: 'booking',
            aggregateId:   booking.id,
            eventType:     'booking.reminder.upcoming',
            payload:       {
              eventId,
              bookingId: booking.id,
              userId:    booking.userId,
              startTime: booking.timeRange.startTime.toISOString(),
              customTitle,
              customBody,
            },
            status:      'pending',
            processedAt: null,
          }),
        );
      });
    }
  }
}

// Payment Expiration Warning Job (4 minutes after creation, 1 minute before expiry)

@Injectable()
export class PaymentWarningJob {
  private readonly logger = new Logger(PaymentWarningJob.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
  ) {}

  @Cron('* * * * *') // every 1 minute
  async run(): Promise<void> {
    const now = Date.now();
    const startRange = new Date(now - 4.5 * 60_000);
    const endRange = new Date(now - 3.5 * 60_000);

    const pendingBookings = await this.bookingRepo.findPendingPaymentCreatedBetween(startRange, endRange);

    if (pendingBookings.length === 0) return;

    for (const booking of pendingBookings) {
      // Check if we've already generated a warning for this booking
      const alreadySent = await this.outboxRepo.exists({
        where: {
          aggregateId: booking.id,
          eventType: 'booking.reminder.payment_expiry',
        },
      });

      if (alreadySent) continue;

      this.logger.log(`Generating payment warning for booking=${booking.id} user=${booking.userId}`);

      await this.dataSource.transaction(async (manager) => {
        const eventId = uuidv4();
        await manager.save(
          manager.create(OutboxOrmEntity, {
            id:            eventId,
            aggregateType: 'booking',
            aggregateId:   booking.id,
            eventType:     'booking.reminder.payment_expiry',
            payload:       {
              eventId,
              bookingId: booking.id,
              userId:    booking.userId,
            },
            status:      'pending',
            processedAt: null,
          }),
        );
      });
    }
  }
}
