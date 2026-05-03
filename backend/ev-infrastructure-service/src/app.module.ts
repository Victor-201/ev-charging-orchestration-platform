import { LoggerModule }     from 'nestjs-pino';
import { Module }           from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { ScheduleModule }  from '@nestjs/schedule';
import { RabbitMQModule }  from '@golevelup/nestjs-rabbitmq';
import {
  StationOrmEntity, ChargingPointOrmEntity, ConnectorOrmEntity, CityOrmEntity,
  PricingRuleOrmEntity, MaintenanceOrmEntity, IncidentOrmEntity,
  ProcessedEventOrmEntity, OutboxOrmEntity,
} from './infrastructure/persistence/typeorm/entities/station.orm-entities';
import { OutboxPublisher } from './infrastructure/messaging/outbox/outbox.publisher';
import { StationModule }   from './modules/station/station.module';

@Module({
  imports: [
    PrometheusModule.register(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,
        autoLogging: { ignore: (req: any): boolean => Boolean(req.url?.includes('/health')) },
        base: { service: 'ev-infrastructure-service' },
        redact: ['req.headers.authorization', '*.password'],
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host:     cfg.get('DB_HOST',     'localhost'),
        port:     parseInt(cfg.get('DB_PORT', '5435')),
        username: cfg.get('DB_USER',     'ev_user'),
        password: cfg.get('DB_PASSWORD', 'ev_secret'),
        database: cfg.get('DB_NAME',     'ev_infrastructure_db'),
        entities: [
          StationOrmEntity, ChargingPointOrmEntity, ConnectorOrmEntity, CityOrmEntity,
          PricingRuleOrmEntity, MaintenanceOrmEntity, IncidentOrmEntity,
          ProcessedEventOrmEntity, OutboxOrmEntity,
        ],
        synchronize: false,
        logging:     cfg.get('NODE_ENV') !== 'production',
        poolSize:    15,
        connectTimeoutMS: 3000,
      }),
      inject: [ConfigService],
    }),

    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        exchanges: [
          { name: 'ev.charging',     type: 'topic', options: { durable: true } },
          { name: 'ev.charging.dlx', type: 'topic', options: { durable: true } },
          { name: 'ev.dlq',          type: 'topic', options: { durable: true } },
        ],
        uri: cfg.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
        prefetchCount: 10,
        connectionInitOptions: { wait: false },
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forFeature([OutboxOrmEntity]),

    StationModule,
  ],
  providers: [OutboxPublisher],
})
export class AppModule {}

