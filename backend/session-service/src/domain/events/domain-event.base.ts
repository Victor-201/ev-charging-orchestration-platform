export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  abstract readonly eventType: string;

  constructor() {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}
