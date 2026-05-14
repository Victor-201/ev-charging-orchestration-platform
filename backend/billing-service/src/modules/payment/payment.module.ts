import { Module, Injectable } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Cron } from '@nestjs/schedule';
import {
  WalletOrmEntity, TransactionOrmEntity, WalletLedgerOrmEntity,
  InvoiceOrmEntity, ProcessedEventOrmEntity, OutboxOrmEntity,
  UserReadModelOrmEntity, SubscriptionOrmEntity, PlanOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/payment.orm-entities';
import { WalletRepository } from '../../infrastructure/persistence/repositories/wallet.repository';
import { TransactionRepository } from '../../infrastructure/persistence/repositories/transaction.repository';
import { VNPayService } from '../../infrastructure/vnpay/vnpay.service';
import { OutboxEventBus, EVENT_BUS } from '../../infrastructure/messaging/outbox-event-bus';
import { OutboxPublisher } from '../../infrastructure/messaging/outbox.publisher';
import {
  SessionReservedConsumer,
  BookingCancelledConsumer,
  BookingNoShowConsumer,
  SessionCompletedBillingConsumer,
  WalletTopupArrearsClearConsumer,
} from '../../infrastructure/messaging/consumers/session-events.consumer';
import {
  CreatePaymentUseCase,
  HandleVNPayCallbackUseCase,
  WalletTopupInitUseCase,
  WalletPayUseCase,
  GetWalletBalanceUseCase,
  GetTransactionHistoryUseCase,
  GetPaymentUseCase,
  PaymentOrchestratorUseCase,
  RefundUseCase,
  TransactionReconciliationJob,
} from '../../application/use-cases/payment.use-cases';
import { PaymentController } from './payment.controller';
import { WALLET_REPOSITORY } from '../../domain/repositories/wallet.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/repositories/transaction.repository.interface';
import { Logger } from '@nestjs/common';

// Reconciliation Cron Scheduler

@Injectable()
class PaymentReconciliationScheduler {
  private readonly logger = new Logger(PaymentReconciliationScheduler.name);
  constructor(private readonly job: TransactionReconciliationJob) {}

  @Cron('0 */30 * * * *') // every 30 minutes
  async run() {
    this.logger.log('Triggering payment reconciliation...');
    await this.job.run();
  }
}

// -----------------------------------------------------------------------------

@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        exchanges: [
          { name: 'ev.payment', type: 'topic', options: { durable: true } },
          { name: 'ev.charging', type: 'topic', options: { durable: true } },
        ],
        uri: cfg.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
        connectionInitOptions: { wait: false },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      WalletOrmEntity, TransactionOrmEntity, WalletLedgerOrmEntity,
      InvoiceOrmEntity, ProcessedEventOrmEntity, OutboxOrmEntity,
      UserReadModelOrmEntity, SubscriptionOrmEntity, PlanOrmEntity,
    ]),
  ],
  controllers: [PaymentController],
  providers: [
    // Repository bindings
    { provide: WALLET_REPOSITORY,      useClass: WalletRepository },
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionRepository },
    // Event bus
    { provide: EVENT_BUS, useClass: OutboxEventBus },
    // Infrastructure
    VNPayService,
    OutboxPublisher,
    // Booking Event Consumers (Automation)
    SessionReservedConsumer,           // deposit during booking creation → automatic wallet deduction
    BookingCancelledConsumer,          // booking cancellation → 100% refund to wallet
    BookingNoShowConsumer,             // no-show → 20% penalty, 80% refund
    SessionCompletedBillingConsumer,   // reconcile deposit against actual charging fees
    WalletTopupArrearsClearConsumer,   // top-up → automatic debt settlement
    // Use Cases
    CreatePaymentUseCase,
    HandleVNPayCallbackUseCase,
    WalletTopupInitUseCase,
    WalletPayUseCase,
    GetWalletBalanceUseCase,
    GetTransactionHistoryUseCase,
    GetPaymentUseCase,
    PaymentOrchestratorUseCase,
    RefundUseCase,
    TransactionReconciliationJob,
    // Cron scheduler
    PaymentReconciliationScheduler,
  ],
})
export class PaymentModule {}

