import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedEventOrmEntity, ChargerReadModelOrmEntity } from '../../persistence/typeorm/entities/booking.orm-entities';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../../domain/repositories/booking.repository.interface';
import { SystemCancelBookingUseCase } from '../../../application/use-cases/system-cancel-booking.use-case';

@Injectable()
export class StationStatusChangedConsumer {
  private readonly logger = new Logger(StationStatusChangedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(ChargerReadModelOrmEntity)
    private readonly chargerRmRepo: Repository<ChargerReadModelOrmEntity>,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: IBookingRepository,
    private readonly systemCancel: SystemCancelBookingUseCase,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'station.status_changed',
    queue:        'session-svc.station.status-sync',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: { eventId?: string; stationId: string; status: string }): Promise<void> {
    const eventId = payload.eventId ?? `station.status_changed:${payload.stationId}:${payload.status}`;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) {
      this.logger.debug(`Duplicate station status event ${eventId}, skipping`);
      return;
    }
    await this.peRepo.save({ eventId, eventType: 'station.status_changed' });

    this.logger.log(`Received station.status_changed for station ${payload.stationId} status=${payload.status}`);

    const isActive = payload.status === 'active';

    // 1. Update all chargers in the read model table for this station
    await this.chargerRmRepo.update({ stationId: payload.stationId }, { isActive });
    this.logger.log(`Updated charger read models for station ${payload.stationId} to isActive=${isActive}`);

    // 2. If station is non-active, cancel all future active bookings on its chargers
    if (!isActive) {
      try {
        const chargers = await this.chargerRmRepo.findBy({ stationId: payload.stationId });
        const chargerIds = chargers.map((c) => c.chargerId);
        if (chargerIds.length > 0) {
          const upcomingBookings = await this.bookingRepo.findUpcomingByChargers(chargerIds);
          this.logger.log(`Found ${upcomingBookings.length} upcoming bookings to cancel for station ${payload.stationId}`);
          for (const booking of upcomingBookings) {
            await this.systemCancel.execute(
              booking.id,
              `Station entered status: ${payload.status}`,
            );
          }
        }
      } catch (err) {
        this.logger.error(`Error processing cancellations for non-active station ${payload.stationId}: ${(err as Error).message}`);
      }
    }
  }
}
