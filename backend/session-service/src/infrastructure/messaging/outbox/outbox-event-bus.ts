import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxOrmEntity } from './outbox.orm-entity';
import { DomainEvent } from '../../../domain/events/domain-event.base';
import { IEventBus } from '../event-bus.interface';

/**
 * OutboxEventBus - writes domain events to event_outbox table inside same transaction.
 * Follows station-service pattern: retry_count, error_message, processedAt fields.
 */
@Injectable()
export class OutboxEventBus implements IEventBus {
  private readonly logger = new Logger(OutboxEventBus.name);

  constructor(
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
  ) {}

  async publishAll(events: DomainEvent[], manager?: EntityManager): Promise<void> {
    if (events.length === 0) return;

    const entities = events.map((e) => {
      const entity = this.outboxRepo.create();
      entity.id            = uuidv4();
      entity.aggregateType = e.eventType.split('.')[0];
      entity.aggregateId   = (e as any).bookingId ?? (e as any).chargerId ?? 'unknown';
      entity.eventType     = e.eventType;
      entity.payload       = { ...e } as Record<string, unknown>;
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
