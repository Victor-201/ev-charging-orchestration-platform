import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxOrmEntity } from '../../persistence/typeorm/entities/auth.orm-entities';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

export interface IEventBus {
  publishAll(events: Array<{ eventType: string; [key: string]: any }>): Promise<void>;
}
export const EVENT_BUS = Symbol('EVENT_BUS');

@Injectable()
export class OutboxEventBus implements IEventBus {
  constructor(@InjectRepository(OutboxOrmEntity) private readonly repo: Repository<OutboxOrmEntity>) {}
  async publishAll(events: Array<{ eventType: string; [key: string]: any }>): Promise<void> {
    if (events.length === 0) return;
    const entities = events.map((e) => {
      const entity = this.repo.create();
      entity.id = crypto.randomUUID();
      entity.aggregateType = e.eventType.split('.')[0];
      entity.aggregateId = e.userId || crypto.randomUUID();
      entity.eventType = e.eventType;
      entity.payload = e;
      entity.status = 'pending';
      return entity;
    });
    await this.repo.save(entities);
  }
}


@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  constructor(
    @InjectRepository(OutboxOrmEntity)
    private readonly repo: Repository<OutboxOrmEntity>,
    private readonly amqp: AmqpConnection,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async publishPending(): Promise<void> {
    const events = await this.repo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    for (const event of events) {
      try {
        await this.amqp.publish(
          'ev.charging',
          event.eventType,
          event.payload,
          { persistent: true },
        );
        await this.repo.update(event.id, {
          status: 'processed',
          processedAt: new Date(),
        });
      } catch (err) {
        this.logger.error(`Failed to publish outbox event ${event.id}: ${err}`);
        const newCount = (event.retryCount ?? 0) + 1;
        await this.repo.update(event.id, {
          status: newCount >= 5 ? 'failed' : 'pending', // dead-letter sau 5 lần
          retryCount: newCount,
          errorMessage: String(err),
        });
      }
    }
  }
}


