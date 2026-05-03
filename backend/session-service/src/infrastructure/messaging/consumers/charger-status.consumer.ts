import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ProcessQueueUseCase } from '../../../application/use-cases/queue.use-case';

interface ChargerStatusChangedPayload {
  chargerId: string;
  status: 'available' | 'in_use' | 'offline' | 'reserved' | 'faulted';
}

@Injectable()
export class ChargerStatusConsumer {
  constructor(private readonly processQueue: ProcessQueueUseCase) {}

  /**
   * Triggered by station-service when a charger becomes available.
   * Routes to ProcessQueueUseCase → auto-assign next in queue.
   */
  @RabbitSubscribe({
    exchange: 'ev.charging',
    routingKey: 'slot.available',
    queue: 'booking.slot.available',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handleSlotAvailable(payload: ChargerStatusChangedPayload): Promise<void> {
    if (payload.status === 'available') {
      await this.processQueue.execute(payload.chargerId);
    }
  }

  /**
   * Triggered after booking.cancelled or booking.completed.
   * Also attempts to serve next in queue.
   */
  @RabbitSubscribe({
    exchange: 'ev.charging',
    routingKey: 'booking.cancelled',
    queue: 'booking.post-cancel-queue',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handleBookingCancelled(payload: { chargerId: string }): Promise<void> {
    await this.processQueue.execute(payload.chargerId);
  }

  @RabbitSubscribe({
    exchange: 'ev.charging',
    routingKey: 'booking.completed',
    queue: 'booking.post-complete-queue',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handleBookingCompleted(payload: { chargerId: string }): Promise<void> {
    await this.processQueue.execute(payload.chargerId);
  }
}
