import { v4 as uuidv4 } from 'uuid';

/**
 * Base class for all domain events in station-service
 */
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  abstract readonly eventType: string;

  constructor() {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
  }
}

// Station Events

export class StationCreatedEvent extends DomainEvent {
  readonly eventType = 'station.created';
  constructor(
    public readonly stationId: string,
    public readonly name: string,
    public readonly ownerId: string | null,
    public readonly cityId: string,
  ) { super(); }
}

export class StationUpdatedEvent extends DomainEvent {
  readonly eventType = 'station.updated';
  constructor(
    public readonly stationId: string,
    public readonly changes: Partial<{
      name: string;
      address: string;
      status: string;
    }>,
  ) { super(); }
}

export class StationStatusChangedEvent extends DomainEvent {
  readonly eventType = 'station.status_changed';
  constructor(
    public readonly stationId: string,
    public readonly status: string,
  ) { super(); }
}

export class StationMaintenanceScheduledEvent extends DomainEvent {
  readonly eventType = 'station.maintenance_scheduled';
  constructor(
    public readonly stationId: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly reason: string,
  ) { super(); }
}

// Charger Events

export class ChargerAddedEvent extends DomainEvent {
  readonly eventType = 'charger.added';
  constructor(
    public readonly chargerId: string,
    public readonly stationId: string,
    public readonly name: string,
    public readonly maxPowerKw: number,
  ) { super(); }
}

export class ChargerStatusChangedEvent extends DomainEvent {
  readonly eventType = 'charger.status_changed';
  constructor(
    public readonly chargerId: string,
    public readonly stationId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
  ) { super(); }
}

export class IncidentReportedEvent extends DomainEvent {
  readonly eventType = 'station.incident_reported';
  constructor(
    public readonly incidentId: string,
    public readonly stationId: string,
    public readonly chargerId: string | null,
    public readonly severity: string,
  ) { super(); }
}
