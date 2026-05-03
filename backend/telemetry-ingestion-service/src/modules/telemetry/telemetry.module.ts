import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ScheduleModule } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { TelemetryController } from './telemetry.controller';
import { HealthController } from './health.controller';
import {
  TelemetryBuffer,
  IngestTelemetryUseCase,
} from '../../application/use-cases/ingest-telemetry.use-case';
import { ClickHouseTelemetryService } from '../../application/use-cases/clickhouse-telemetry.service';

/**
 * BufferFlushScheduler — Periodic flush of accumulated telemetry buffer.
 *
 * Ensures buffered readings are published even when batches don't fill up.
 * Runs every 30 seconds.
 */
@Injectable()
class BufferFlushScheduler {
  private readonly logger = new Logger(BufferFlushScheduler.name);
  constructor(private readonly ingest: IngestTelemetryUseCase) {}

  @Cron('*/30 * * * * *') // every 30 seconds
  async flush() {
    const count = await this.ingest.flushAll();
    if (count > 0) {
      this.logger.debug(`Periodic buffer flush: published ${count} readings`);
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        exchanges: [
          {
            name: 'ev.telemetry',
            type: 'topic',
            options: { durable: true },
          },
          {
            // DLQ exchange for failed publish retry
            name: 'ev.telemetry.dlq',
            type: 'fanout',
            options: { durable: true },
          },
        ],
        uri: cfg.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
        connectionInitOptions: { wait: false },
        enableControllerDiscovery: true,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TelemetryController, HealthController],
  providers: [
    TelemetryBuffer,
    IngestTelemetryUseCase,
    BufferFlushScheduler,
    ClickHouseTelemetryService,
  ],
})
export class TelemetryModule {}
