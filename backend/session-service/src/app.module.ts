import { LoggerModule } from 'nestjs-pino';
import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
// @ts-ignore from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import {
  BookingOrmEntity, BookingStatusHistoryOrmEntity,
  ChargerReadModelOrmEntity, VehicleReadModelOrmEntity,
  PricingSnapshotOrmEntity, QueueOrmEntity,
  SchedulingSlotOrmEntity, ProcessedEventOrmEntity,
  OutboxOrmEntity,
} from './infrastructure/persistence/typeorm/entities/booking.orm-entities';
import { BookingModule } from './modules/booking/booking.module';
import { SessionModule } from './modules/main/session.module';
import { SessionOrmEntity, TelemetryOrmEntity, ChargerStateOrmEntity, UserDebtReadModelOrmEntity, BookingReadModelOrmEntity } from './infrastructure/persistence/typeorm/entities/session.orm-entities';
import { QueueModule } from './modules/queue/queue.module';
import { OutboxOrmEntity as OutboxEntity } from './infrastructure/messaging/outbox/outbox.orm-entity';

@Module({
  imports: [
    PrometheusModule.register(),
    LoggerModule.forRoot({ pinoHttp: { level: process.env.LOG_LEVEL ?? 'info', transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } } : undefined, autoLogging: { ignore: (req: any): boolean => Boolean(req.url?.includes('/health')) }, base: { service: 'booking-service' }, redact: ['req.headers.authorization', '*.password'] } }),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host:     cfg.get('DB_HOST',     'localhost'),
        port:     parseInt(cfg.get('DB_PORT',     '5436')),
        username: cfg.get('DB_USER',     'ev_user'),
        password: cfg.get('DB_PASSWORD', 'ev_secret'),
        database: cfg.get('DB_NAME',     'ev_session_db'),
        entities: [
          BookingOrmEntity, BookingStatusHistoryOrmEntity,
          ChargerReadModelOrmEntity, VehicleReadModelOrmEntity,
          PricingSnapshotOrmEntity, QueueOrmEntity,
          SchedulingSlotOrmEntity, ProcessedEventOrmEntity,
          OutboxOrmEntity,
        ],
        synchronize: false,
        logging:     cfg.get('NODE_ENV') !== 'production',
        poolSize:    20,
        connectTimeoutMS: 3000,
      }),
      inject: [ConfigService],
    }),

    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        exchanges: [
          { name: 'ev.charging', type: 'topic', options: { durable: true } },
            { name: 'ev.charging.dlx', type: 'topic', options: { durable: true } },
            { name: 'ev.dlq', type: 'topic', options: { durable: true } },
        ],
        uri: cfg.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
        prefetchCount: parseInt(cfg.get('RABBITMQ_PREFETCH', '10')),
        connectionInitOptions: { wait: false },
      }),
      inject: [ConfigService],
    }),

    // OutboxPublisher needs AppModule scope (RabbitMQModule)
    TypeOrmModule.forFeature([OutboxOrmEntity]),

    BookingModule,
    QueueModule,
  ],
})
export class AppModule {}





