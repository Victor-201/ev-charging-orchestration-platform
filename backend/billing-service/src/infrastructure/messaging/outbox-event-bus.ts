import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxOrmEntity } from '../persistence/typeorm/entities/payment.orm-entities';
import { PaymentDomainEvent } from '../../domain/events/payment.events';

export const EVENT_BUS = Symbol('EVENT_BUS');

export interface IPaymentEventBus {
  publishAll(events: PaymentDomainEvent[], manager?: EntityManager): Promise<void>;
}

@Injectable()
export class OutboxEventBus implements IPaymentEventBus {
  private readonly logger = new Logger(OutboxEventBus.name);

  constructor(
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
  ) {}

  async publishAll(events: PaymentDomainEvent[], manager?: EntityManager): Promise<void> {
    if (events.length === 0) return;

    const entities = events.map((e) => {
      const entity         = this.outboxRepo.create();
      entity.id            = uuidv4();
      entity.aggregateType = e.eventType.split('.')[0];
      
      // Ensure aggregateId is always a valid UUID to prevent PostgreSQL DB schema errors.
      // Check typical UUID fields in order of relevance.
      let aggId = (e as any).transactionId ?? (e as any).walletId ?? (e as any).bookingId ?? (e as any).userId ?? (e as any).sessionId ?? (e as any).id;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!aggId || !uuidRegex.test(aggId)) {
        aggId = uuidv4();
      }
      
      entity.aggregateId   = aggId;
      entity.eventType     = e.eventType;
      entity.payload       = { ...e } as object;
      entity.status        = 'pending';
      entity.retryCount    = 0;
      entity.errorMessage  = null;
      entity.processedAt   = null;
      return entity;
    });

    if (manager) {
      await manager.save(OutboxOrmEntity, entities);
    } else {
      await this.outboxRepo.save(entities);
    }

    this.logger.debug(`Wrote ${entities.length} event(s) to outbox`);
  }
}
