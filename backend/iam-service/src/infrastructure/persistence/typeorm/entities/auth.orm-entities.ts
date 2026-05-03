import {
  Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn,
  Index, ManyToMany, JoinTable, ManyToOne, JoinColumn,
} from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// users — master identity record
// Aligned: auth_db.sql users table (BCNF)
// ─────────────────────────────────────────────────────────────────────────────
@Entity('users')
@Index(['email'], { unique: true })
@Index(['status'])
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  status: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  // ── MFA ───────────────────────────────────────────────────────────────────
  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', type: 'varchar', length: 255, nullable: true })
  mfaSecret: string | null;

  // ── Account Lock ──────────────────────────────────────────────────────────
  @Column({ name: 'failed_login_count', type: 'smallint', default: 0 })
  failedLoginCount: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}


// ─────────────────────────────────────────────────────────────────────────────
// auth_sessions — refresh token + device tracking
// Aligned: auth_db.sql auth_sessions table
// ─────────────────────────────────────────────────────────────────────────────
@Entity('auth_sessions')
@Index(['userId'])
@Index(['refreshTokenHash'], { unique: true })
export class SessionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'refresh_token_hash', length: 255, unique: true })
  refreshTokenHash: string;

  @Column({ name: 'device_fingerprint', type: 'varchar', length: 255, nullable: true })
  deviceFingerprint: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// roles — RBAC roles (admin, staff, user)
// ─────────────────────────────────────────────────────────────────────────────
@Entity('roles')
export class RoleOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// permissions — resource:action pairs
// ─────────────────────────────────────────────────────────────────────────────
@Entity('permissions')
export class PermissionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string; // format: resource:action

  @Column({ length: 50 })
  resource: string;

  @Column({ length: 50 })
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// role_permissions — junction: role ↔ permission
// ─────────────────────────────────────────────────────────────────────────────
@Entity('role_permissions')
export class RolePermissionOrmEntity {
  @Column({ name: 'role_id', type: 'uuid', primary: true })
  roleId: string;

  @Column({ name: 'permission_id', type: 'uuid', primary: true })
  permissionId: string;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'NOW()' })
  grantedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// user_roles — junction: user ↔ role (với expiry support)
// ─────────────────────────────────────────────────────────────────────────────
@Entity('user_roles')
@Index(['userId'])
export class UserRoleOrmEntity {
  @Column({ name: 'user_id', type: 'uuid', primary: true })
  userId: string;

  @Column({ name: 'role_id', type: 'uuid', primary: true })
  roleId: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt: Date;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// email_verification_tokens
// ─────────────────────────────────────────────────────────────────────────────
@Entity('email_verification_tokens')
@Index(['tokenHash'], { unique: true })
export class EmailVerificationTokenOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'token_hash', length: 255, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// password_reset_tokens
// ─────────────────────────────────────────────────────────────────────────────
@Entity('password_reset_tokens')
@Index(['tokenHash'], { unique: true })
export class PasswordResetTokenOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'token_hash', length: 255, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// event_outbox — transactional outbox
// ─────────────────────────────────────────────────────────────────────────────
@Entity('event_outbox')
@Index(['status', 'createdAt'], { where: `"status" = 'pending'` })
@Index(['aggregateType', 'aggregateId'])
export class OutboxOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_type', length: 100 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'event_type', length: 100 })
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
