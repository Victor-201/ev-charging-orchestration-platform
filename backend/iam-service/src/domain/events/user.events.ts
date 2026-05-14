import * as crypto from 'crypto';
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  abstract readonly eventType: string;

  constructor() {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

// Profile Events

export class UserProfileUpdatedEvent extends DomainEvent {
  readonly eventType = 'user.profile_updated';
  constructor(
    public readonly userId: string,
    public readonly updatedFields: string[],
  ) { super(); }
}

// Vehicle Events

export class VehicleRegisteredEvent extends DomainEvent {
  readonly eventType = 'vehicle.registered';
  constructor(
    public readonly vehicleId: string,
    public readonly userId: string,
    public readonly plateNumber: string,
  ) { super(); }
}

export class VehicleDeletedEvent extends DomainEvent {
  readonly eventType = 'vehicle.deleted';
  constructor(
    public readonly vehicleId: string,
    public readonly userId: string,
  ) { super(); }
}

export class PrimaryVehicleChangedEvent extends DomainEvent {
  readonly eventType = 'vehicle.primary_changed';
  constructor(
    public readonly vehicleId: string,
    public readonly userId: string,
  ) { super(); }
}
