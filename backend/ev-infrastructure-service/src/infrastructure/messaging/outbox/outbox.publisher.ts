import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { OutboxOrmEntity } from '../../persistence/typeorm/entities/station.orm-entities';

/**
 * OutboxPublisher — polling scheduler
 * Đọc pending events từ event_outbox → publish lên RabbitMQ → mark processed/failed
 * Retry tối đa 5 lần, sau đó chuyển sang 'failed'
 */
@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);
  private readonly MAX_RETRIES = 5;
  private readonly EXCHANGE    = 'ev.charging';

  constructor(
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
    private readonly amqp: AmqpConnection,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async publishPending(): Promise<void> {
    const pending = await this.outboxRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    for (const event of pending) {
      try {
        await this.amqp.publish(
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
        event.retryCount += 1;
        event.errorMessage = err?.message ?? 'unknown error';
        if (event.retryCount >= this.MAX_RETRIES) {
          event.status = 'failed';
          this.logger.error(
            `Event ${event.id} moved to dead-letter after ${event.retryCount} retries`,
          );
        } else {
          this.logger.warn(`Event ${event.id} retry ${event.retryCount}/${this.MAX_RETRIES}`);
        }
      }
      await this.outboxRepo.save(event);
    }
  }
}
