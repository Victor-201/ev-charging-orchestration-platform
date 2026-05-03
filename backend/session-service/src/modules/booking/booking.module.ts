import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { HttpModule } from '@nestjs/axios';
import { PricingHttpClient } from '../../infrastructure/http/pricing.http-client';
import {
  BookingOrmEntity, BookingStatusHistoryOrmEntity,
  ChargerReadModelOrmEntity, PricingSnapshotOrmEntity,
  OutboxOrmEntity, ProcessedEventOrmEntity,
  QueueOrmEntity, UserDebtReadModelOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/booking.orm-entities';
import { BookingRepository } from '../../infrastructure/persistence/typeorm/repositories/booking.repository';
import { ChargerRepository } from '../../infrastructure/persistence/typeorm/repositories/charger.repository';
import { QueueRepository } from '../../infrastructure/persistence/typeorm/repositories/queue.repository';
import { OutboxEventBus } from '../../infrastructure/messaging/outbox/outbox-event-bus';
import { OutboxPublisher } from '../../infrastructure/messaging/outbox/outbox.publisher';
import { BookingGateway } from '../../infrastructure/realtime/booking.gateway';
import { CreateBookingUseCase, GetAvailabilityUseCase } from '../../application/use-cases/create-booking.use-case';
import {
  AutoConfirmBookingUseCase,
  CancelBookingUseCase,
  AutoCompleteBookingUseCase,
} from '../../application/use-cases/booking-lifecycle.use-case';
import {
  AutoExpireBookingsJob,
  NoShowDetectionJob,
  GetQueuePositionUseCase,
} from '../../application/use-cases/booking-jobs.use-case';
import {
  JoinQueueUseCase,
  LeaveQueueUseCase,
  ProcessQueueUseCase,
} from '../../application/use-cases/queue.use-case';
import { SchedulingEngine } from '../../domain/services/scheduling-engine.service';
import { PriorityQueueService } from '../../domain/services/priority-queue.service';
import { BookingController } from './booking.controller';
import { BOOKING_REPOSITORY, CHARGER_REPOSITORY, QUEUE_REPOSITORY, EVENT_BUS } from './booking.tokens';
import { ArrearsGuard } from '../../shared/guards/arrears.guard';
import {
  BookingArrearsCreatedConsumer,
  BookingArrearsClearedConsumer,
} from '../../infrastructure/messaging/consumers/arrears-sync.consumer';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import {
  BillingDeductedConsumer, BillingDeductionFailedConsumer,
  SessionStartedConsumer,
  ChargerStatusConsumer,
} from '../../infrastructure/messaging/consumers/booking.consumers';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout:    5000,
      maxRedirects: 3,
    }),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        exchanges: [
          { name: 'ev.charging', type: 'topic', options: { durable: true } },
          { name: 'ev.booking',  type: 'topic', options: { durable: true } },
        ],
        uri: cfg.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
        connectionInitOptions: { wait: false },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      BookingOrmEntity, BookingStatusHistoryOrmEntity,
      ChargerReadModelOrmEntity, PricingSnapshotOrmEntity,
      OutboxOrmEntity, ProcessedEventOrmEntity, QueueOrmEntity,
      UserDebtReadModelOrmEntity,  // ─ ArrearsGuard read-model
    ]),
  ],
  controllers: [BookingController],
  providers: [
    // Repository bindings
    { provide: BOOKING_REPOSITORY,  useClass: BookingRepository },
    { provide: CHARGER_REPOSITORY,  useClass: ChargerRepository },
    { provide: QUEUE_REPOSITORY,    useClass: QueueRepository },
    // Event bus (outbox pattern)
    { provide: EVENT_BUS, useClass: OutboxEventBus },
    // Infrastructure
    OutboxPublisher,
    BookingGateway,
    // Domain services
    SchedulingEngine,
    PriorityQueueService,
    // Use cases — Booking lifecycle (tự động hóa)
    CreateBookingUseCase,
    GetAvailabilityUseCase,
    AutoConfirmBookingUseCase,   // triggered by payment.completed
    CancelBookingUseCase,
    AutoCompleteBookingUseCase,  // triggered by session.started
    // HTTP clients
    PricingHttpClient,           // gọi station-service lấy giá sạc
    // Jobs
    AutoExpireBookingsJob,       // expire PENDING_PAYMENT sau 5 phút
    NoShowDetectionJob,          // phạt no-show sau 10 phút
    GetQueuePositionUseCase,
    // Queue use cases
    JoinQueueUseCase,
    LeaveQueueUseCase,
    ProcessQueueUseCase,
    // RabbitMQ consumers
    BillingDeductedConsumer, BillingDeductionFailedConsumer,    // payment thành công → auto confirm
    SessionStartedConsumer,      // session bắt đầu → auto complete
    ChargerStatusConsumer,       // charger available → serve queue
    // ─── Arrears Sync Consumers (Khóa Nợ Xấu) ───────────────────────────────
    BookingArrearsCreatedConsumer,  // wallet.arrears.created → block user
    BookingArrearsClearedConsumer,  // wallet.arrears.cleared → unblock user
    // ─── Guards ──────────────────────────────────────────────────────────
    JwtAuthGuard,
    RolesGuard,
    ArrearsGuard,               // chặn user nợ tạo booking mới
  ],
  exports: [
    CreateBookingUseCase,
    AutoConfirmBookingUseCase,
    AutoCompleteBookingUseCase,
    CHARGER_REPOSITORY,
    BOOKING_REPOSITORY,
  ],
})
export class BookingModule {}

