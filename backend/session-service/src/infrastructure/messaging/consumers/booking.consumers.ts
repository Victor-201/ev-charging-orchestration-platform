import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedEventOrmEntity } from '../outbox/outbox-orm-entity';
import { AutoConfirmBookingUseCase, CancelBookingUseCase } from '../../../application/use-cases/booking-lifecycle.use-case';
import { AutoCompleteBookingUseCase } from '../../../application/use-cases/booking-lifecycle.use-case';
import { ProcessQueueUseCase } from '../../../application/use-cases/queue.use-case';

@Injectable()
export class BillingDeductedConsumer {
  private readonly logger = new Logger(BillingDeductedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly autoConfirm: AutoConfirmBookingUseCase,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey: 'billing.deducted_v1',
    queue: 'session-svc.billing.deducted_v1',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    bookingId: string;
    userId: string;
    amount: number;
    transactionId: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? "billing.deducted:" + payload.bookingId;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) {
      this.logger.debug("Duplicate event, skipping");
      return;
    }
    await this.peRepo.save({ eventId, eventType: 'billing.deducted_v1' });

    try {
      await this.autoConfirm.execute({ bookingId: payload.bookingId, transactionId: payload.transactionId });
      this.logger.log("Confirmed booking automatically");
    } catch (err: any) {
      this.logger.error("Failed to auto-confirm booking: " + err.message);
    }
  }
}

@Injectable()
export class BillingDeductionFailedConsumer {
  private readonly logger = new Logger(BillingDeductionFailedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly cancelBooking: CancelBookingUseCase,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey: 'billing.deduction_failed_v1',
    queue: 'session-svc.billing.deduction_failed_v1',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    bookingId: string;
    userId: string;
    reason: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? "billing.deduction_failed:" + payload.bookingId;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) {
      this.logger.debug("Duplicate event " + eventId + ", skipping");
      return;
    }
    await this.peRepo.save({ eventId, eventType: 'billing.deduction_failed_v1' });

    this.logger.error("Deduction failed for booking " + payload.bookingId + ": " + payload.reason + " - Compensating transaction triggered.");
    await this.cancelBooking.execute({ bookingId: payload.bookingId, userId: payload.userId, reason: 'SAGA_COMPENSATION_INSUFFICIENT_FUNDS' });
  }
}

@Injectable()
export class SessionStartedConsumer {
  private readonly logger = new Logger(SessionStartedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly autoComplete: AutoCompleteBookingUseCase,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'session.started',
    queue:        'session-svc.session.started',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: { eventId?: string; bookingId: string }): Promise<void> {
    const eventId = payload.eventId ?? "session.started:" + payload.bookingId;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) return;
    await this.peRepo.save({ eventId, eventType: 'session.started' });

    await this.autoComplete.execute({ bookingId: payload.bookingId });
  }
}

@Injectable()
export class ChargerStatusConsumer {
  private readonly logger = new Logger(ChargerStatusConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly processQueue: ProcessQueueUseCase,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'charger.status_changed',
    queue:        'session-svc.charger.status',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: { eventId?: string; chargerId: string; status: string }): Promise<void> {
    const eventId = payload.eventId ?? "charger.status:" + payload.chargerId;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) return;
    await this.peRepo.save({ eventId, eventType: 'charger.status_changed' });

    if (payload.status === 'AVAILABLE') {
      await this.processQueue.execute(payload.chargerId);
    }
  }
}

