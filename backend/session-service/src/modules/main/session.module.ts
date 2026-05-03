import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionController } from './session.controller';
import { StartSessionUseCase, StopSessionUseCase, RecordTelemetryUseCase, GetSessionUseCase, BookingConfirmedConsumer, PaymentCompletedConsumer } from '../../application/use-cases/session.use-cases';
import { AutoChargeUseCase } from '../../application/use-cases/autocharge.use-case';
import { IdleFeeDetectionJob, StoppedSessionBillingJob } from '../../application/use-cases/idle-fee.use-case';
import { LateDeliveryReconciler } from '../../application/use-cases/late-delivery-reconciler';
import { ReconciliationJob, FaultDetectionService } from '../../application/use-cases/reconciliation.use-cases';
import { SessionRepository } from '../../infrastructure/persistence/typeorm/repositories/session.repository';
import { BookingConfirmedSyncConsumer, BookingCancelledSyncConsumer } from '../../infrastructure/messaging/consumers/booking-sync.consumer';
import {
  BillingDeductedConsumer,
  BillingDeductionFailedConsumer,
} from '../../infrastructure/messaging/consumers/booking.consumers';
import { TelemetryConsumer } from '../../infrastructure/messaging/consumers/telemetry.consumer';
import { ChargingGateway } from '../../infrastructure/realtime/charging.gateway';
import { SessionOrmEntity, TelemetryOrmEntity, ChargerStateOrmEntity, ProcessedEventOrmEntity, UserDebtReadModelOrmEntity, BookingReadModelOrmEntity } from '../../infrastructure/persistence/typeorm/entities/session.orm-entities';
import { OutboxOrmEntity } from '../../infrastructure/persistence/typeorm/entities/booking.orm-entities'; // Shared outbox

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionOrmEntity, TelemetryOrmEntity, ChargerStateOrmEntity,
      ProcessedEventOrmEntity, UserDebtReadModelOrmEntity, BookingReadModelOrmEntity,
      OutboxOrmEntity
    ])
  ],
  controllers: [SessionController],
  providers: [
    StartSessionUseCase, StopSessionUseCase, RecordTelemetryUseCase, GetSessionUseCase,
    // Saga consumers (billing outcome → booking state machine)
    BillingDeductedConsumer, BillingDeductionFailedConsumer,
    // Legacy consumers preserved
    BookingConfirmedConsumer, PaymentCompletedConsumer,
    AutoChargeUseCase, IdleFeeDetectionJob,
    LateDeliveryReconciler, StoppedSessionBillingJob, ReconciliationJob, FaultDetectionService,
    { provide: 'ISessionRepository', useClass: SessionRepository },
    BookingConfirmedSyncConsumer, BookingCancelledSyncConsumer, TelemetryConsumer, ChargingGateway,
  ],
  exports: [StartSessionUseCase, StopSessionUseCase, GetSessionUseCase],
})
export class SessionModule {}







