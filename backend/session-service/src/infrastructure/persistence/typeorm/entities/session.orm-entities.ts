import {
  Entity, Column, PrimaryColumn, CreateDateColumn, Index,
} from 'typeorm';

// â”€â”€â”€ charging_sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('charging_sessions')
@Index('idx_session_user_status',    ['userId', 'status'])
@Index('idx_session_charger_status', ['chargerId', 'status'])
@Index('idx_session_booking',        ['bookingId'], { where: `booking_id IS NOT NULL` })
@Index('idx_session_active',         ['chargerId', 'startTime'], { where: `status = 'active'` })
export class SessionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true, unique: true })
  bookingId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @Column({ name: 'start_time', type: 'timestamptz', default: () => 'NOW()' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime: Date | null;

  @Column({ name: 'start_meter_wh', type: 'bigint', default: 0 })
  startMeterWh: number;

  @Column({ name: 'end_meter_wh', type: 'bigint', nullable: true })
  endMeterWh: number | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'completed', 'error', 'interrupted'],
    default: 'pending',
  })
  status: string;

  @Column({ name: 'error_reason', type: 'varchar', length: 500, nullable: true })
  errorReason: string | null;

  @Column({ name: 'initiated_by', length: 20, default: 'user' })
  initiatedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// â”€â”€â”€ session_telemetry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Time-series table. High write throughput. Separate Ä‘á»ƒ khÃ´ng bloat session rows.

@Entity('session_telemetry')
@Index('idx_telemetry_session', ['sessionId', 'recordedAt'])
export class TelemetryOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'NOW()' })
  recordedAt: Date;

  @Column({ name: 'power_kw', type: 'decimal', precision: 8, scale: 3, nullable: true })
  powerKw: number | null;

  @Column({ name: 'meter_wh', type: 'bigint', nullable: true })
  meterWh: number | null;

  @Column({ name: 'voltage_v', type: 'decimal', precision: 7, scale: 2, nullable: true })
  voltageV: number | null;

  @Column({ name: 'current_a', type: 'decimal', precision: 7, scale: 3, nullable: true })
  currentA: number | null;

  @Column({ name: 'soc_percent', type: 'smallint', nullable: true })
  socPercent: number | null;

  @Column({ name: 'temperature_c', type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureC: number | null;

  @Column({ name: 'error_code', type: 'varchar', length: 50, nullable: true })
  errorCode: string | null;
}

// â”€â”€â”€ charger_state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Real-time charger operational state (1 row per charger, upserted on change).
// Read by Socket.IO gateway for realtime status.

@Entity('charger_state')
export class ChargerStateOrmEntity {
  @PrimaryColumn({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @Column({
    type: 'enum',
    enum: ['available', 'occupied', 'faulted', 'offline', 'reserved'],
    default: 'available',
  })
  availability: string;

  @Column({ name: 'active_session_id', type: 'uuid', nullable: true })
  activeSessionId: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode: string | null;

  @Column({ name: 'last_heartbeat_at', type: 'timestamptz', nullable: true })
  lastHeartbeatAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}

// â”€â”€â”€ processed_events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('processed_events')
export class ProcessedEventOrmEntity {
  @PrimaryColumn({ name: 'event_id', length: 255 })
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
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 100 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: object;

  @Column({
    type: 'enum',
    enum: ['pending', 'published', 'failed'],
    default: 'pending',
  })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;
}

// ─── user_debt_read_models ────────────────────────────────────────────────────
// Read-model sync từ Payment Service (wallet.arrears events).
// Dùng bởi ChargingArrearsGuard để block user nợ quét QR bắt đầu sạc.
// ─────────────────────────────────────────────────────────────────────────────

@Entity('user_debt_read_models')
export class UserDebtReadModelOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** true = block user khởi động phiên sạc */
  @Column({ name: 'has_outstanding_debt', default: false })
  hasOutstandingDebt: boolean;

  /** Số tiền đang nợ (VND) */
  @Column({ name: 'arrears_amount', type: 'numeric', precision: 12, scale: 0, default: 0 })
  arrearsAmount: number;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'NOW()' })
  syncedAt: Date;
}

// ─── booking_read_models ──────────────────────────────────────────────────────
// Read-model sync từ Booking Service (booking.confirmed event).
// Dùng bởi StartSessionUseCase để validate QR time window:
//   - Không cho phép quét QR sớm hơn 15 phút trước startTime
//   - Không cho phép quét QR muộn hơn 5 phút sau endTime
// ─────────────────────────────────────────────────────────────────────────────

@Entity('booking_read_models')
@Index('idx_brm_charger', ['chargerId'])
export class BookingReadModelOrmEntity {
  @PrimaryColumn({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'charger_id', type: 'uuid' })
  chargerId: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  /** QR token sinh ra sau khi thanh toán thành công */
  @Column({ name: 'qr_token', type: 'varchar', length: 40, nullable: true })
  qrToken: string | null;

  @Column({ name: 'deposit_amount', type: 'numeric', precision: 12, scale: 0, default: 0 })
  depositAmount: number;

  @Column({ name: 'deposit_transaction_id', type: 'uuid', nullable: true })
  depositTransactionId: string | null;

  @Column({ name: 'connector_type', type: 'varchar', length: 20, nullable: true })
  connectorType: string | null;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'NOW()' })
  syncedAt: Date;
}
