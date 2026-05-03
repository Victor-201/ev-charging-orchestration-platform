export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  abstract readonly eventType: string;

  constructor() {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

// ─── User Events ──────────────────────────────────────────────────────────────

export class UserRegisteredEvent extends DomainEvent {
  readonly eventType = 'user.registered';
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly role: string,
  ) { super(); }
}

export class UserDeactivatedEvent extends DomainEvent {
  readonly eventType = 'user.deactivated';
  constructor(public readonly userId: string) { super(); }
}

export class UserSuspendedEvent extends DomainEvent {
  readonly eventType = 'user.suspended';
  constructor(public readonly userId: string) { super(); }
}

export class UserReactivatedEvent extends DomainEvent {
  readonly eventType = 'user.reactivated';
  constructor(public readonly userId: string) { super(); }
}

export class PasswordChangedEvent extends DomainEvent {
  readonly eventType = 'user.password_changed';
  constructor(public readonly userId: string) { super(); }
}

export class EmailVerifiedEvent extends DomainEvent {
  readonly eventType = 'user.email_verified';
  constructor(public readonly userId: string, public readonly email: string) { super(); }
}

// ─── Role Events ──────────────────────────────────────────────────────────────

export class RoleAssignedEvent extends DomainEvent {
  readonly eventType = 'role.assigned';
  constructor(
    public readonly userId: string,
    public readonly roleName: string,
    public readonly assignedBy: string | null,
  ) { super(); }
}

export class RoleRevokedEvent extends DomainEvent {
  readonly eventType = 'role.revoked';
  constructor(
    public readonly userId: string,
    public readonly roleName: string,
  ) { super(); }
}

// ─── Security Events ──────────────────────────────────────────────────────────

export class AccountLockedEvent extends DomainEvent {
  readonly eventType = 'user.account_locked';
  constructor(
    public readonly userId: string,
    public readonly lockedUntil: Date,
  ) { super(); }
}

export class SuspiciousLoginEvent extends DomainEvent {
  readonly eventType = 'user.suspicious_login';
  constructor(
    public readonly userId: string,
    public readonly reason: string,
    public readonly ipAddress?: string,
  ) { super(); }
}

export class MfaEnabledEvent extends DomainEvent {
  readonly eventType = 'user.mfa_enabled';
  constructor(public readonly userId: string) { super(); }
}
