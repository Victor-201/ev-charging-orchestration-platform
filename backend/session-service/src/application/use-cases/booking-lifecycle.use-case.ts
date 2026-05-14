import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';
import {
  CancelBookingCommand,
  CompleteBookingCommand,
} from '../commands/booking.commands';
import {
  BookingNotFoundException,
  InvalidBookingStateException,
} from '../../domain/exceptions/booking.exceptions';
import { IEventBus, EVENT_BUS } from '../../infrastructure/messaging/event-bus.interface';
import { Booking } from '../../domain/aggregates/booking.aggregate';

// Auto-Confirm Use Case (triggered by payment.completed event)

/**
 * AutoConfirmBookingUseCase
 *
 * Called upon receiving PaymentCompletedEvent from Payment Service.
 * Automatically:
 * 1. Find booking by depositTransactionId
 * 2. Call booking.confirmWithPayment() -> generate QR Token
 * 3. Emit BookingConfirmedEvent (Notification Service sends QR to user)
 * 4. Charging Service receives event -> change charger state -> reserved
 *
 * NO manual HTTP confirm endpoint - 100% automated.
 */
@Injectable()
export class AutoConfirmBookingUseCase {
  private readonly logger = new Logger(AutoConfirmBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  async execute(cmd: { bookingId: string, transactionId: string }): Promise<Booking | null> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const booking = await this.bookingRepo.findById(cmd.bookingId);
      if (!booking) {
        this.logger.warn(`Booking not found for bookingId=${cmd.bookingId}`);
        return null;
      }

      try {
        booking.confirmWithPayment(cmd.transactionId);
      } catch (err) {
        this.logger.warn(
          `Cannot confirm booking ${booking.id}: ${(err as Error).message}`,
        );
        return null;
      }

      await this.bookingRepo.save(booking, manager);
      await this.eventBus.publishAll(booking.domainEvents, manager);
      booking.clearDomainEvents();

      this.logger.log(
        `Booking AUTO-CONFIRMED: ${booking.id} QR=${booking.qrToken} ` +
        `charger=${booking.chargerId} user=${booking.userId}`,
      );
      return booking;
    });
  }
}

// Cancel Booking Use Case

@Injectable()
export class CancelBookingUseCase {
  private readonly logger = new Logger(CancelBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  async execute(cmd: CancelBookingCommand): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      const booking = await this.bookingRepo.findById(cmd.bookingId);
      if (!booking) throw new BookingNotFoundException(cmd.bookingId);

      // Ownership check
      if (booking.userId !== cmd.userId) {
        throw new BookingNotFoundException(cmd.bookingId);
      }

      booking.cancel(cmd.reason || 'User cancelled');

      await this.bookingRepo.save(booking, manager);
      await this.eventBus.publishAll(booking.domainEvents, manager);
      booking.clearDomainEvents();

      this.logger.log(`Booking cancelled: ${cmd.bookingId} refund=${booking.depositAmount ?? 0}VND`);
    });
  }
}

// Complete Booking Use Case (auto from session.started event)

/**
 * AutoCompleteBookingUseCase
 *
 * Triggered when Charging Service emits SessionStartedEvent.
 * Automatically complete booking when user scans QR at charger and charging starts.
 */
@Injectable()
export class AutoCompleteBookingUseCase {
  private readonly logger = new Logger(AutoCompleteBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  async execute(cmd: CompleteBookingCommand): Promise<Booking | null> {
    return this.dataSource.transaction(async (manager) => {
      const booking = await this.bookingRepo.findById(cmd.bookingId);
      if (!booking) {
        this.logger.warn(`Booking ${cmd.bookingId} not found for auto-complete`);
        return null;
      }

      try {
        booking.complete();
      } catch (err) {
        this.logger.warn(
          `Cannot complete booking ${cmd.bookingId}: ${(err as Error).message}`,
        );
        return null;
      }

      await this.bookingRepo.save(booking, manager);
      await this.eventBus.publishAll(booking.domainEvents, manager);
      booking.clearDomainEvents();

      this.logger.log(`Booking AUTO-COMPLETED: ${cmd.bookingId}`);
      return booking;
    });
  }
}


