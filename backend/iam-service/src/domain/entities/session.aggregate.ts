/**
 * Session Aggregate — auth-service bounded context
 * Aligned với: auth_db.sql auth_sessions table
 * Owns: refresh token lifecycle, device tracking
 */
export class Session {
  private _revokedAt: Date | null;

  readonly id: string;
  readonly userId: string;
  readonly refreshTokenHash: string;
  readonly deviceFingerprint: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly expiresAt: Date;
  readonly createdAt: Date;

  private constructor(props: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    deviceFingerprint: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt?: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.refreshTokenHash = props.refreshTokenHash;
    this.deviceFingerprint = props.deviceFingerprint;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
    this.expiresAt = props.expiresAt;
    this._revokedAt = props.revokedAt;
    this.createdAt = props.createdAt ?? new Date();
  }

  // ─── Factory Methods ───────────────────────────────────────────────────────

  static create(props: {
    userId: string;
    refreshTokenHash: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Session {
    return new Session({
      id: crypto.randomUUID(),
      userId: props.userId,
      refreshTokenHash: props.refreshTokenHash,
      deviceFingerprint: props.deviceFingerprint ?? null,
      ipAddress: props.ipAddress ?? null,
      userAgent: props.userAgent ?? null,
      expiresAt: props.expiresAt,
      revokedAt: null,
    });
  }

  static reconstitute(props: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    deviceFingerprint: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
  }): Session {
    return new Session(props);
  }

  // ─── Domain Behaviors ──────────────────────────────────────────────────────

  /**
   * Invariant: session phải active (chưa revoke và chưa expire) để dùng được
   */
  assertIsUsable(): void {
    if (this._revokedAt !== null) {
      throw new Error('Session has been revoked');
    }
    if (this.expiresAt < new Date()) {
      throw new Error('Session has expired');
    }
  }

  revoke(): void {
    if (this._revokedAt !== null) return; // idempotent
    this._revokedAt = new Date();
  }

  get isActive(): boolean {
    return this._revokedAt === null && this.expiresAt > new Date();
  }

  get revokedAt(): Date | null { return this._revokedAt; }
}
