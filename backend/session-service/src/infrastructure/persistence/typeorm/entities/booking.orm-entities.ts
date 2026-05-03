import {
  Entity, Column, PrimaryColumn, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

// â”€â”€â”€ bookings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GIST EXCLUDE set via SQL migration â€” TypeORM @Exclusion is unsupported for
// partial-where exclusions, so we rely on DB-level constraint + double-check
// in use-case hasOverlap().

@Entity('bookings')
@Index('idx_book_user_status',  ['userId', 'status', 'startTime'])
@Index('idx_book_charger_time', ['chargerId', 'startTime'])
export class BookingOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @Column({ name: 'pricing_snapshot_id', type: 'uuid', nullable: true })
  pricingSnapshotId: string | null;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: ['pending_payment', 'confirmed', 'cancelled', 'completed', 'expired', 'no_show'],
    default: 'pending_payment',
  })
  status: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  // ─── Deposit & QR ──────────────────────────────────────────────────────────

  /** Token QR một lần — sinh sau khi payment thành công */
  @Column({ name: 'qr_token', type: 'varchar', length: 40, nullable: true, unique: true })
  qrToken: string | null;

  /** Số tiền cọ (VND) */
  @Column({ name: 'deposit_amount', type: 'numeric', precision: 12, scale: 0, nullable: true })
  depositAmount: number | null;

  /** Transaction ID của giao dịch cọ */
  @Column({ name: 'deposit_transaction_id', type: 'uuid', nullable: true })
  depositTransactionId: string | null;

  /** Phí phạt no-show (VND) */
  @Column({ name: 'penalty_amount', type: 'numeric', precision: 12, scale: 0, nullable: true })
  penaltyAmount: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// â”€â”€â”€ booking_status_history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('booking_status_history')
@Index('idx_bsh_booking', ['bookingId'])
export class BookingStatusHistoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ name: 'changed_at', type: 'timestamptz', default: () => 'NOW()' })
  changedAt: Date;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;
}

// â”€â”€â”€ charger_read_models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('charger_read_models')
export class ChargerReadModelOrmEntity {
  @PrimaryColumn({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @Column({ name: 'station_id', type: 'uuid' })
  stationId: string;

  @Column({ name: 'station_name', type: 'varchar', length: 255 })
  stationName: string;

  @Column({ name: 'city_name', type: 'varchar', length: 100, nullable: true })
  cityName: string | null;


  @Column({ name: 'connector_type', type: 'varchar', length: 20 })
  connectorType: string;

  @Column({ name: 'max_power_kw', type: 'numeric', precision: 8, scale: 2, nullable: true })
  maxPowerKw: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'NOW()' })
  syncedAt: Date;
}

// â”€â”€â”€ vehicle_read_models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('vehicle_read_models')
export class VehicleReadModelOrmEntity {
  @PrimaryColumn({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'plate_number', type: 'varchar', length: 20 })
  plateNumber: string;

  @Column({ name: 'connector_type', type: 'varchar', length: 20, nullable: true })
  connectorType: string | null;

  @Column({ name: 'model_label', type: 'varchar', length: 100, nullable: true })
  modelLabel: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'NOW()' })
  syncedAt: Date;
}

// â”€â”€â”€ pricing_snapshots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('pricing_snapshots')
@Index('idx_psnap_charger', ['chargerId'])
export class PricingSnapshotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @Column({ name: 'connector_type', type: 'varchar', length: 20 })
  connectorType: string;

  @Column({ name: 'price_per_kwh', type: 'numeric', precision: 10, scale: 4 })
  pricePerKwh: number;

  @Column({ name: 'price_per_minute', type: 'numeric', precision: 10, scale: 4, nullable: true })
  pricePerMinute: number | null;

  @Column({ type: 'char', length: 3, default: 'VND' })
  currency: string;

  @CreateDateColumn({ name: 'captured_at', type: 'timestamptz' })
  capturedAt: Date;
}

// â”€â”€â”€ queue_entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('queue_entries')
@Index('idx_queue_charger', ['chargerId', 'priority', 'joinedAt'], { where: `status = 'waiting'` })
@Index('idx_queue_user',    ['userId', 'status'])
export class QueueOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({ type: 'smallint', default: 100 })
  priority: number;

  @Column({
    type: 'enum',
    enum: ['waiting', 'notified', 'served', 'cancelled', 'expired'],
    default: 'waiting',
  })
  status: string;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'NOW()' })
  joinedAt: Date;

  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;

  @Column({ name: 'served_at', type: 'timestamptz', nullable: true })
  servedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}

// â”€â”€â”€ scheduling_slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('scheduling_slots')
@Index('idx_slot_charger', ['chargerId', 'suggestedStart'])
@Index('idx_slot_user',    ['userId'], { where: `accepted_at IS NULL` })
export class SchedulingSlotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({ name: 'suggested_start', type: 'timestamptz' })
  suggestedStart: Date;

  @Column({ name: 'suggested_end', type: 'timestamptz' })
  suggestedEnd: Date;

  @Column({ name: 'confidence_score', type: 'numeric', precision: 4, scale: 3, nullable: true })
  confidenceScore: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  algorithm: string | null;

  @CreateDateColumn({ name: 'generated_at', type: 'timestamptz' })
  generatedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId: string | null;
}

// â”€â”€â”€ processed_events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('processed_events')
export class ProcessedEventOrmEntity {
  @PrimaryColumn({ name: 'event_id', length: 100 })
  eventId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt: Date;
}

// â”€â”€â”€ event_outbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('event_outbox')
@Index('idx_outbox_pending', ['status', 'createdAt'], { where: `status = 'pending'` })
export class OutboxOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 100 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;


  @Column({
    type: 'enum',
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
  })
  status: string;

  @Column({ name: 'retry_count', type: 'smallint', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}

// ─── user_debt_read_models ────────────────────────────────────────────────────
// Read-model được sync từ User Service qua event.
// Dùng để ArrearsGuard check hasOutstandingDebt mà không cần remote call.
// Cập nhật bởi:
//   - WalletArrearsCreatedConsumer   → hasOutstandingDebt = true
//   - WalletArrearsClearedConsumer   → hasOutstandingDebt = false
// ─────────────────────────────────────────────────────────────────────────────

@Entity('user_debt_read_models')
export class UserDebtReadModelOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Cờ nợ xấu — true = block mọi tính năng booking */
  @Column({ name: 'has_outstanding_debt', default: false })
  hasOutstandingDebt: boolean;

  /** Tổng số tiền đang nợ (VND) */
  @Column({ name: 'arrears_amount', type: 'numeric', precision: 12, scale: 0, default: 0 })
  arrearsAmount: number;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'NOW()' })
  syncedAt: Date;
}
