import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxOrmEntity } from './outbox.orm-entity';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/**
 * OutboxPublisher — polling 5s, publishes pending events to RabbitMQ.
 * Retry up to MAX_RETRIES times before marking 'failed'.
 */
@Injectable()
export class OutboxPublisher {
  private readonly logger      = new Logger(OutboxPublisher.name);
  private readonly MAX_RETRIES = 5;
  private readonly EXCHANGE    = 'ev.charging';
  private readonly BATCH_SIZE  = 50;

  constructor(
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async publishPending(): Promise<void> {
    const events = await this.outboxRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      take: this.BATCH_SIZE,
    });

    for (const event of events) {
      try {
        await this.amqpConnection.publish(
          this.EXCHANGE,
          event.eventType,
          event.payload,
          { persistent: true, messageId: event.id },
        );
        event.status      = 'processed';
        event.processedAt = new Date();
        event.errorMessage = null;
        this.logger.log(`Published event ${event.eventType} [${event.id}]`);
      } catch (err: any) {
        event.retryCount  += 1;
        event.errorMessage = err?.message ?? 'unknown error';
        if (event.retryCount >= this.MAX_RETRIES) {
          event.status = 'failed';
          this.logger.error(`Event ${event.id} dead-letter after ${event.retryCount} retries`);
        } else {
          this.logger.warn(`Event ${event.id} retry ${event.retryCount}/${this.MAX_RETRIES}`);
        }
      }
      await this.outboxRepo.save(event);
    }
  }
}
