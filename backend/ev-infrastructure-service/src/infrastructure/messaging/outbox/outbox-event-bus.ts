import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { OutboxOrmEntity } from '../../persistence/typeorm/entities/station.orm-entities';
import { DomainEvent } from '../../../domain/events/station.events';
import { v4 as uuidv4 } from 'uuid';

export interface IEventBus {
  publishAll(events: DomainEvent[], manager?: EntityManager): Promise<void>;
}
export const EVENT_BUS = Symbol('EVENT_BUS');

@Injectable()
export class OutboxEventBus implements IEventBus {
  private readonly logger = new Logger(OutboxEventBus.name);

  constructor(
    @InjectRepository(OutboxOrmEntity)
    private readonly repo: Repository<OutboxOrmEntity>,
  ) {}

  async publishAll(events: DomainEvent[], manager?: EntityManager): Promise<void> {
    if (events.length === 0) return;

    const entities = events.map((e) => {
      const entity = this.repo.create();
      entity.id            = uuidv4();
      entity.aggregateType = e.eventType.split('.')[0]; // 'station' | 'charger'
      entity.aggregateId   = (e as any).stationId ?? (e as any).chargerId ?? 'unknown';
      entity.eventType     = e.eventType;
      entity.payload       = { ...e };
      entity.status        = 'pending';
      entity.retryCount    = 0;
      entity.processedAt   = null;
      entity.errorMessage  = null;
      return entity;
    });

    if (manager) await manager.save(OutboxOrmEntity, entities);
    else await this.repo.save(entities);
    this.logger.debug(`Wrote ${entities.length} event(s) to outbox`);
  }
}
