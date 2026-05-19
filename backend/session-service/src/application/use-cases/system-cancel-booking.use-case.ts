import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';
import { IEventBus, EVENT_BUS } from '../../infrastructure/messaging/event-bus.interface';
import { Booking } from '../../domain/aggregates/booking.aggregate';

@Injectable()
export class SystemCancelBookingUseCase {
  private readonly logger = new Logger(SystemCancelBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  async execute(bookingId: string, reason: string): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      const booking = await this.bookingRepo.findById(bookingId);
      if (!booking) {
        this.logger.warn(`System cancel: Booking ${bookingId} not found`);
        return;
      }

      try {
        booking.cancel(reason);
      } catch (err) {
        this.logger.warn(`System cancel failed for booking ${bookingId}: ${(err as Error).message}`);
        return;
      }

      await this.bookingRepo.save(booking, manager);
      await this.eventBus.publishAll(booking.domainEvents, manager);
      booking.clearDomainEvents();

      this.logger.log(`Booking cancelled by system: ${bookingId} reason="${reason}" refund=${booking.depositAmount ?? 0}VND`);
    });
  }
}
