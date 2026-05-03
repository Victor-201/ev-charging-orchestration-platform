import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

// â”€â”€â”€ notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BCNF: id â†’ {user_id, type, channel, title, body, status, metadata, read_at}
// Indexes: fast unread query, fast per-user query

@Entity('notifications')
@Index('idx_notif_user_status', ['userId', 'status', 'createdAt'])
@Index('idx_notif_unread_user', ['userId', 'readAt'])   // for unread count
export class NotificationOrmEntity {
  @PrimaryColumn('uuid')                                                        id: string;
  @Column({ name: 'user_id',   type: 'uuid' })                                 userId: string;
  @Column({ type: 'varchar', length: 50 })                                                       type: string;
  @Column({ type: 'varchar', length: 20 })                                                       channel: string;
  @Column({ type: 'varchar', length: 500 })                                                      title: string;
  @Column({ type: 'text' })                                                     body: string;
  @Column({ length: 20, default: 'pending' })                                   status: string;
  @Column({ type: 'jsonb', default: '{}' })                                     metadata: object;
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })             readAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })                createdAt: Date;
}

// â”€â”€â”€ devices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BCNF: id â†’ {user_id, platform, push_token, device_name, last_active_at}
// push_token UNIQUE: 1 FCM token â†’ 1 device row (upsert on re-register)
// BCNF justified: token determines no other non-key attribute

@Entity('devices')
@Index('idx_dev_user',  ['userId'])
@Index('idx_dev_token', ['pushToken'])
export class DeviceOrmEntity {
  @PrimaryColumn('uuid')                                                           id: string;
  @Column({ name: 'user_id',       type: 'uuid' })                                userId: string;
  @Column({ name: 'platform',      length: 20 })                                  platform: string;
  @Column({ name: 'push_token',    length: 512, unique: true })                   pushToken: string;
  @Column({ name: 'device_name',   type: 'varchar', length: 255, nullable: true })                 deviceName: string | null;
  @Column({ name: 'last_active_at',type: 'timestamptz', default: () => 'NOW()' }) lastActiveAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })                  createdAt: Date;
}

// â”€â”€â”€ notification_preferences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BCNF: user_id â†’ {enable_push, enable_realtime, enable_email, quiet_hours}
// Candidate key: user_id (1 row per user)

@Entity('notification_preferences')
export class NotificationPreferenceOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })                              userId: string;
  @Column({ name: 'enable_push',     default: true })                            enablePush: boolean;
  @Column({ name: 'enable_realtime', default: true })                            enableRealtime: boolean;
  @Column({ name: 'enable_email',    default: true })                            enableEmail: boolean;
  @Column({ name: 'enable_sms',      default: false })                           enableSms: boolean;
  @Column({ name: 'quiet_hours_start', type: 'smallint', nullable: true })       quietHoursStart: number | null;
  @Column({ name: 'quiet_hours_end',   type: 'smallint', nullable: true })       quietHoursEnd: number | null;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })                 updatedAt: Date;
}

// â”€â”€â”€ processed_events (idempotency guard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Entity('processed_events')
export class ProcessedEventOrmEntity {
  @PrimaryColumn({ name: 'event_id', length: 255 })                event_id: string;
  @Column({ name: 'event_type', type: 'varchar', length: 100 })                     eventType: string;
  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' }) processedAt: Date;
}
