export abstract class PaymentDomainEvent {
  readonly occurredAt: Date = new Date();
  abstract readonly eventType: string;
}

export class PaymentCompletedEvent extends PaymentDomainEvent {
  readonly eventType = 'payment.completed';
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly relatedId: string | null,
    public readonly relatedType: string | null,
  ) { super(); }
}

export class PaymentFailedEvent extends PaymentDomainEvent {
  readonly eventType = 'payment.failed';
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly reason: string,
  ) { super(); }
}

export class WalletTopupCompletedEvent extends PaymentDomainEvent {
  readonly eventType = 'wallet.topup.completed';
  constructor(
    public readonly walletId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly transactionId: string,
  ) { super(); }
}

export class RefundCompletedEvent extends PaymentDomainEvent {
  readonly eventType = 'payment.refund.completed';
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly bookingId: string,
    public readonly reason: string,
  ) { super(); }
}

export class WalletArrearsCreatedEvent extends PaymentDomainEvent {
  readonly eventType = 'wallet.arrears.created';
  constructor(
    public readonly userId: string,
    public readonly walletId: string,
    public readonly arrearsAmount: number,
    public readonly sessionId: string,
  ) { super(); }
}

export class WalletArrearsClearedEvent extends PaymentDomainEvent {
  readonly eventType = 'wallet.arrears.cleared';
  constructor(
    public readonly userId: string,
    public readonly walletId: string,
  ) { super(); }
}

// SAGA Choreography Events

/** Emitted by billing-service when wallet deduction succeeds (session.reserved consumed). */
export class BillingDeductedEvent extends PaymentDomainEvent {
  readonly eventType = 'billing.deducted_v1';
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly transactionId: string,
    public readonly correlationId: string,
  ) { super(); }
}

/** Emitted by billing-service when wallet deduction fails — triggers session-service compensation. */
export class BillingDeductionFailedEvent extends PaymentDomainEvent {
  readonly eventType = 'billing.deduction_failed_v1';
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly reason: 'INSUFFICIENT_FUNDS' | 'WALLET_NOT_FOUND' | 'WALLET_FROZEN',
    public readonly correlationId: string,
  ) { super(); }
}

// Billing Notification Events

/**
 * Emitted when idle fees exceed 0 — notification-service sends a push notification to the user.
 * Informs the user about penalties for occupying the charger beyond the allowed time.
 */
export class IdleFeeChargedEvent extends PaymentDomainEvent {
  readonly eventType = 'billing.idle_fee_charged_v1';
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly idleFeeVnd: number,
    public readonly chargeableIdleMinutes: number,
    public readonly idleFeePerMinuteVnd: number,
    public readonly idleGraceMinutes: number,
    public readonly transactionId: string,
  ) { super(); }
}

/**
 * Emitted when actual charging costs exceed the deposit — additional funds are deducted from the wallet.
 * Notification-service informs the user to ensure transparency regarding the extra deduction.
 */
export class ExtraChargeDebitedEvent extends PaymentDomainEvent {
  readonly eventType = 'billing.extra_charge_v1';
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly extraAmountVnd: number,
    public readonly depositAmount: number,
    public readonly totalFeeVnd: number,
    public readonly transactionId: string,
  ) { super(); }
}

/**
 * Emitted when actual charging costs are less than the deposit — the surplus is refunded to the wallet.
 * Notification-service informs the user about the refunded amount.
 */
export class RefundIssuedEvent extends PaymentDomainEvent {
  readonly eventType = 'billing.refund_issued_v1';
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly refundAmountVnd: number,
    public readonly depositAmount: number,
    public readonly totalFeeVnd: number,
    public readonly transactionId: string,
  ) { super(); }
}
