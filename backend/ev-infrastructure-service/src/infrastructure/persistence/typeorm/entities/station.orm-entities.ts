import {
  Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index, Check,
} from 'typeorm';

// cities
// BCNF fix: separated from stations, FD: city_id -> {city_name, region, country_code}

@Entity('cities')
export class CityOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'city_name', length: 100, unique: true })
  cityName: string;

  @Column({ type: 'varchar', length: 100 })
  region: string;

  @Column({ name: 'country_code', type: 'char', length: 2, default: 'VN' })
  countryCode: string;

  @OneToMany(() => StationOrmEntity, (s) => s.city)
  stations: StationOrmEntity[];
}

// stations
// BCNF: station_id -> {name, address, city_id, lat, lng, status, owner_id, owner_name}

@Entity('stations')
@Index('idx_sta_city',   ['cityId'])
@Index('idx_sta_status', ['status'])
@Index('idx_sta_geo',    ['latitude', 'longitude'])
export class StationOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ name: 'city_id', type: 'uuid' })
  cityId: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({
    type: 'enum',
    enum: ['active', 'closed', 'maintenance', 'inactive'],
    default: 'active',
  })
  status: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ name: 'owner_name', type: 'varchar', length: 100, nullable: true })
  ownerName: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => CityOrmEntity, (c) => c.stations)
  @JoinColumn({ name: 'city_id' })
  city: CityOrmEntity;

  @OneToMany(() => ChargingPointOrmEntity, (cp) => cp.station)
  chargingPoints: ChargingPointOrmEntity[];

  @OneToMany(() => MaintenanceOrmEntity, (m) => m.station)
  maintenances: MaintenanceOrmEntity[];

  @OneToMany(() => IncidentOrmEntity, (i) => i.station)
  incidents: IncidentOrmEntity[];

  @OneToMany(() => PricingRuleOrmEntity, (p) => p.station)
  pricingRules: PricingRuleOrmEntity[];
}

// charging_points
// BCNF: cp_id -> {station_id, name, external_id, max_power_kw, status}

@Entity('charging_points')
@Index('idx_cp_station', ['stationId'])
@Index('idx_cp_status',  ['status'])
export class ChargingPointOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'station_id', type: 'uuid' })
  stationId: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100, unique: true, nullable: true })
  externalId: string | null;

  @Column({ name: 'max_power_kw', type: 'numeric', precision: 8, scale: 2, nullable: true })
  maxPowerKw: number | null;

  @Column({
    type: 'enum',
    enum: ['available', 'in_use', 'offline', 'faulted', 'reserved'],
    default: 'available',
  })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => StationOrmEntity, (s) => s.chargingPoints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'station_id' })
  station: StationOrmEntity;

  @OneToMany(() => ConnectorOrmEntity, (c) => c.chargingPoint)
  connectors: ConnectorOrmEntity[];
}

// connectors
// BCNF: connector_id -> {cp_id, connector_type, max_power_kw}
// (cp_id, connector_type) is candidate key

@Entity('connectors')
@Index('idx_conn_cp', ['chargingPointId'])
export class ConnectorOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'charging_point_id', type: 'uuid' })
  chargingPointId: string;

  @Column({
    name: 'connector_type',
    type: 'enum',
    enum: ['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Other'],
  })
  connectorType: string;

  @Column({ name: 'max_power_kw', type: 'numeric', precision: 8, scale: 2, nullable: true })
  maxPowerKw: number | null;

  @ManyToOne(() => ChargingPointOrmEntity, (cp) => cp.connectors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charging_point_id' })
  chargingPoint: ChargingPointOrmEntity;
}

// pricing_rules
// BCNF: price depends on (station, connector_type, time_window)
// NOT per-charger

@Entity('pricing_rules')
@Index('idx_price_lookup', ['stationId', 'connectorType', 'validFrom'])
export class PricingRuleOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'station_id', type: 'uuid' })
  stationId: string;

  @Column({
    name: 'connector_type',
    type: 'enum',
    enum: ['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Other'],
  })
  connectorType: string;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo: Date | null;

  @Column({ name: 'hour_start', type: 'smallint', nullable: true })
  hourStart: number | null;

  @Column({ name: 'hour_end', type: 'smallint', nullable: true })
  hourEnd: number | null;

  @Column({ name: 'day_mask', type: 'smallint', default: 0 })
  dayMask: number;

  @Column({ name: 'price_per_kwh', type: 'numeric', precision: 10, scale: 4 })
  pricePerKwh: number;

  @Column({ name: 'price_per_minute', type: 'numeric', precision: 10, scale: 4, nullable: true })
  pricePerMinute: number | null;

  /**
   * Idle Fee (Occupancy fee after full charge)
   * VinFast standard: 15–30 free minutes, then penalty per minute.
   * Admin can change these values at any time.
   */
  @Column({ name: 'idle_grace_minutes', type: 'smallint', default: 20 })
  idleGraceMinutes: number;   // Free minutes after full charge (default: 20 minutes)

  @Column({ name: 'idle_fee_per_minute', type: 'numeric', precision: 10, scale: 2, default: 1000 })
  idleFeePerMinute: number;   // VND/minute when grace period is exceeded (default: 1,000 VND/minute)

  /** Label for Admin UI (e.g., 'Morning Peak', 'Night Off-peak') */
  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string | null;

  @Column({ type: 'char', length: 3, default: 'VND' })
  currency: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => StationOrmEntity, (s) => s.pricingRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'station_id' })
  station: StationOrmEntity;
}

// station_maintenance

@Entity('station_maintenance')
@Index('idx_maint_station', ['stationId', 'startTime'])
@Index('idx_maint_time',    ['startTime', 'endTime'])
export class MaintenanceOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'station_id', type: 'uuid' })
  stationId: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'scheduled_by', type: 'uuid' })
  scheduledBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => StationOrmEntity, (s) => s.maintenances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'station_id' })
  station: StationOrmEntity;
}

// station_incidents

@Entity('station_incidents')
@Index('idx_inc_station', ['stationId', 'status'])
export class IncidentOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'station_id', type: 'uuid' })
  stationId: string;

  @Column({ name: 'point_id', type: 'uuid', nullable: true })
  pointId: string | null;

  @Column({ name: 'reported_by', type: 'uuid', nullable: true })
  reportedBy: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: string;

  @Column({
    type: 'enum',
    enum: ['pending_confirmation', 'in_progress', 'resolved', 'rejected'],
    default: 'pending_confirmation',
  })
  status: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => StationOrmEntity, (s) => s.incidents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'station_id' })
  station: StationOrmEntity;
}

// processed_events

@Entity('processed_events')
export class ProcessedEventOrmEntity {
  @PrimaryColumn({ name: 'event_id', length: 100 })
  eventId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt: Date;
}

// event_outbox

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
