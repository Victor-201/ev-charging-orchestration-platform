import { PaymentDomainEvent } from './payment.events';

export class SessionReservedEventV1 extends PaymentDomainEvent {
  readonly eventType = 'session.reserved';
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly chargerId: string,
    public readonly depositAmount: number,
  ) { super(); }
}

export class BillingDeductedEventV1 extends PaymentDomainEvent {
  readonly eventType = 'billing.deducted';
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly transactionId: string,
  ) { super(); }
}

export class BillingDeductionFailedEventV1 extends PaymentDomainEvent {
  readonly eventType = 'billing.deduction_failed';
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly reason: string,
  ) { super(); }
}
