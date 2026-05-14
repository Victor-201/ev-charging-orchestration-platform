import {
  Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn,
} from 'typeorm';

// users_cache — read model synced from auth-service via events
// BCNF: user_id -> {email, full_name, phone, role_name, status}
@Entity('users_cache')
export class UsersCacheOrmEntity {
  @PrimaryColumn('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'role_name', length: 50, default: 'user' })
  roleName: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  /** Bad debt flag — blocks user from new bookings until debt is cleared */
  @Column({ name: 'has_outstanding_debt', default: false })
  hasOutstandingDebt: boolean;

  /** Outstanding debt amount (VND) */
  @Column({ name: 'arrears_amount', type: 'numeric', precision: 12, scale: 0, default: 0 })
  arrearsAmount: number;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'NOW()' })
  syncedAt: Date;
}

// user_arrears
// Detailed record of each user debt instance
@Entity('user_arrears')
@Index(['userId', 'status'])
export class UserArrearsOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'arrears_amount', type: 'numeric', precision: 12, scale: 0 })
  arrearsAmount: number;

  @Column({ length: 20, default: 'outstanding' }) // 'outstanding' | 'cleared'
  status: string;

  @Column({ name: 'cleared_at', type: 'timestamptz', nullable: true })
  clearedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// user_profiles — extended profile (avatar, address)
// BCNF: user_id -> {avatar_url, address}
@Entity('user_profiles')
export class UserProfileOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// user_fcm_tokens — push notification devices
// BCNF: fcm_token -> {user_id, device_type, is_active}
@Entity('user_fcm_tokens')
@Index(['userId'])
export class UserFcmTokenOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'fcm_token', type: 'text', unique: true })
  fcmToken: string;

  @Column({
    name: 'device_type',
    type: 'enum',
    enum: ['ios', 'android', 'web'],
  })
  deviceType: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// vehicle_models — EV model specs (BCNF decomposition)
// CK: (brand, model_name, year) -> {battery_kwh, charge_port, max_power_kw}
@Entity('vehicle_models')
export class VehicleModelOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  brand: string;

  @Column({ name: 'model_name', type: 'varchar', length: 50 })
  modelName: string;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ name: 'battery_capacity_kwh', type: 'numeric', precision: 6, scale: 2, nullable: true })
  batteryCapacityKwh: number | null;

  @Column({ name: 'usable_capacity_kwh', type: 'numeric', precision: 6, scale: 2, nullable: true })
  usableCapacityKwh: number | null;

  @Column({
    name: 'default_charge_port',
    type: 'enum',
    enum: ['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Other'],
    nullable: true,
  })
  defaultChargePort: string | null;

  @Column({ name: 'max_ac_power_kw', type: 'numeric', precision: 5, scale: 2, nullable: true })
  maxAcPowerKw: number | null;

  @Column({ name: 'max_dc_power_kw', type: 'numeric', precision: 5, scale: 2, nullable: true })
  maxDcPowerKw: number | null;
}

// vehicles — individual EV owned by a user
// BCNF: vehicle_id -> {owner_id, model_id, plate_number, color, status}
@Entity('vehicles')
@Index(['ownerId', 'status'])
@Index(['plateNumber'], { unique: true })
@Index(['macAddress'], { unique: true, where: `"mac_address" IS NOT NULL` })
@Index(['vinNumber'], { unique: true, where: `"vin_number" IS NOT NULL` })
export class VehicleOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string;

  @Column({ name: 'plate_number', length: 20, unique: true })
  plateNumber: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color: string | null;

  @Column({
    type: 'enum',
    enum: ['active', 'deleted'],
    default: 'active',
  })
  status: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  /**
   * MAC address của xe (từ dây sạc OCPP)
   * Used for AutoCharge: plug-and-charge without QR codes.
   */
  @Column({ name: 'mac_address', type: 'varchar', length: 17, nullable: true, unique: true })
  macAddress: string | null;

  /**
   * Số VIN (Vehicle Identification Number) — 17 ký tự chuẩn quốc tế
   * Used for ISO 15118 Plug & Charge.
   */
  @Column({ name: 'vin_number', type: 'varchar', length: 17, nullable: true, unique: true })
  vinNumber: string | null;

  /** Is AutoCharge activated? User must explicitly enable this. */
  @Column({ name: 'autocharge_enabled', default: false })
  autochargeEnabled: boolean;

  // Versioning for optimistic concurrency
  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// vehicle_audit_logs — audit trail for vehicle changes
@Entity('vehicle_audit_logs')
@Index(['vehicleId'])
@Index(['userId'])
export class VehicleAuditLogOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'action', length: 30 })
  action: string; // 'created' | 'updated' | 'deleted' | 'set_primary'

  @Column({ name: 'changes', type: 'jsonb', nullable: true })
  changes: object | null;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// profile_audit_logs — audit trail for user profile changes
@Entity('profile_audit_logs')
@Index(['userId'])
export class ProfileAuditLogOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'action', length: 30 })
  action: string; // 'updated' | 'deleted'

  @Column({ name: 'changes', type: 'jsonb', nullable: true })
  changes: object | null;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}



// staff_profiles — staff-specific data
@Entity('staff_profiles')
@Index(['stationId'])
export class StaffProfileOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'station_id', type: 'uuid' })
  stationId: string;

  @Column({ name: 'station_name', type: 'varchar', length: 255, nullable: true })
  stationName: string | null;

  @Column({
    type: 'enum',
    enum: ['operator', 'manager', 'technician', 'security'],
    default: 'operator',
  })
  position: string;

  @Column({
    type: 'enum',
    enum: ['morning', 'afternoon', 'night'],
    default: 'morning',
  })
  shift: string;

  @Column({ name: 'hire_date', type: 'date', default: () => 'CURRENT_DATE' })
  hireDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// attendance — daily check-in/check-out per staff
// BCNF: (staff_id, work_date) -> {check_in, check_out, status}
@Entity('attendance')
@Index(['staffId', 'workDate'])
export class AttendanceOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId: string;

  @Column({ name: 'work_date', type: 'date' })
  workDate: Date;

  @Column({ name: 'check_in', type: 'timestamptz', nullable: true })
  checkIn: Date | null;

  @Column({ name: 'check_out', type: 'timestamptz', nullable: true })
  checkOut: Date | null;

  @Column({
    type: 'enum',
    enum: ['present', 'late', 'absent', 'leave'],
    default: 'absent',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// subscriptions — user plan subscriptions
@Entity('subscriptions')
@Index(['userId', 'status'])
export class SubscriptionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @Column({ name: 'plan_name', type: 'varchar', length: 100, nullable: true })
  planName: string | null;

  @Column({ name: 'plan_type', type: 'varchar', length: 20, nullable: true })
  planType: string | null;

  @Column({ name: 'start_date', type: 'timestamptz', default: () => 'NOW()' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate: Date | null;

  @Column({ name: 'auto_renew', default: true })
  autoRenew: boolean;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// processed_events — idempotency for consumed events
@Entity('processed_events')
export class ProcessedEventOrmEntity {
  @PrimaryColumn({ name: 'event_id', length: 100 })
  eventId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ name: 'processed_at', type: 'timestamptz', default: () => 'NOW()' })
  processedAt: Date;
}

// event_outbox
@Entity('event_outbox')
@Index(['status', 'createdAt'], { where: `"status" = 'pending'` })
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
