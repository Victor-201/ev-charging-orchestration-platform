import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, StationCreatedEvent, StationUpdatedEvent, StationStatusChangedEvent } from '../events/station.events';
import {
  InvalidStationDataException,
  StationNotActiveException,
} from '../exceptions/station.exceptions';
import { Location } from '../value-objects/location.vo';
import { Charger, ChargerStatus } from './charger.aggregate';

/**
 * StationStatus — aligned with SQL ENUM station_status
 * closed instead of COMING_SOON
 */
export enum StationStatus {
  ACTIVE      = 'active',
  CLOSED      = 'closed',
  MAINTENANCE = 'maintenance',
  INACTIVE    = 'inactive',
}

/**
 * Station Aggregate Root
 * Owns: location, chargers list, status
 * Aligned với: stations table in station_db.sql
 *
 * BCNF notes:
 * - city_id FK → cities table (not owned by this aggregate)
 * - owner_id logical ref to auth_db (no FK)
 * - price NOT here → pricing_rules table (different determinant)
 */
export class Station {
  readonly id: string;
  readonly createdAt: Date;
  private _name: string;
  private _address: string | null;
  private _cityId: string;
  private _location: Location;
  private _status: StationStatus;
  private _ownerId: string | null;
  private _ownerName: string | null;
  private _updatedAt: Date;
  private _chargers: Charger[] = [];
  private _domainEvents: DomainEvent[] = [];

  private constructor(props: {
    id: string;
    name: string;
    address: string | null;
    cityId: string;
    location: Location;
    status: StationStatus;
    ownerId: string | null;
    ownerName: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this._name = props.name;
    this._address = props.address;
    this._cityId = props.cityId;
    this._location = props.location;
    this._status = props.status;
    this._ownerId = props.ownerId;
    this._ownerName = props.ownerName;
    this.createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  // Factory Methods

  /**
   * Creates a new station — validates and emits StationCreatedEvent
   * Location validation delegated to Location VO
   */
  static create(props: {
    name: string;
    address?: string;
    cityId: string;
    latitude: number;
    longitude: number;
    ownerId?: string;
    ownerName?: string;
  }): Station {
    if (!props.name || props.name.trim().length < 2) {
      throw new InvalidStationDataException('Station name must be at least 2 characters');
    }
    if (!props.cityId) {
      throw new InvalidStationDataException('cityId is required');
    }

    const location = Location.create(props.latitude, props.longitude);

    const station = new Station({
      id: uuidv4(),
      name: props.name.trim(),
      address: props.address?.trim() ?? null,
      cityId: props.cityId,
      location,
      status: StationStatus.ACTIVE,
      ownerId: props.ownerId ?? null,
      ownerName: props.ownerName?.trim() ?? null,
    });

    station._domainEvents.push(
      new StationCreatedEvent(station.id, station._name, station._ownerId, station._cityId),
    );
    return station;
  }

  /**
   * Reconstitutes from persistence — does not emit domain events
   */
  static reconstitute(props: {
    id: string;
    name: string;
    address: string | null;
    cityId: string;
    latitude: number;
    longitude: number;
    status: StationStatus;
    ownerId: string | null;
    ownerName: string | null;
    createdAt: Date;
    updatedAt: Date;
  }, chargers: Charger[] = []): Station {
    const location = Location.create(props.latitude, props.longitude);
    const station = new Station({ ...props, location });
    station._chargers = chargers;
    return station;
  }

  // Domain Behaviors

  /**
   * Update station info — partial update, emits StationUpdatedEvent
   */
  update(changes: Partial<{
    name: string;
    address: string;
  }>): void {
    if (changes.name !== undefined) {
      if (changes.name.trim().length < 2) {
        throw new InvalidStationDataException('Station name must be at least 2 characters');
      }
      this._name = changes.name.trim();
    }
    if (changes.address !== undefined) {
      this._address = changes.address.trim();
    }
    this._updatedAt = new Date();
    this._domainEvents.push(new StationUpdatedEvent(this.id, { name: this._name, address: this._address ?? undefined }));
  }

  /**
   * Changes station status — emits StationStatusChangedEvent
   */
  changeStatus(newStatus: StationStatus): void {
    this._status = newStatus;
    this._updatedAt = new Date();
    this._domainEvents.push(new StationStatusChangedEvent(this.id, newStatus));
  }

  /**
   * Adds a charger to the station
   * Invariant: station must be ACTIVE
   */
  addCharger(charger: Charger): void {
    if (this._status !== StationStatus.ACTIVE) {
      throw new StationNotActiveException(this.id);
    }
    this._chargers.push(charger);
  }

  // Query Methods

  getAvailableChargerCount(): number {
    return this._chargers.filter((c) => c.isAvailable()).length;
  }

  getTotalChargerCount(): number { return this._chargers.length; }
  getChargers(): Charger[]      { return [...this._chargers]; }

  hasAvailableCharger(): boolean { return this.getAvailableChargerCount() > 0; }

  isActive(): boolean { return this._status === StationStatus.ACTIVE; }

  // Getters

  get name(): string              { return this._name; }
  get address(): string | null    { return this._address; }
  get cityId(): string            { return this._cityId; }
  get latitude(): number          { return this._location.latitude; }
  get longitude(): number         { return this._location.longitude; }
  get location(): Location        { return this._location; }
  get status(): StationStatus     { return this._status; }
  get ownerId(): string | null    { return this._ownerId; }
  get ownerName(): string | null  { return this._ownerName; }
  get updatedAt(): Date           { return this._updatedAt; }
  get domainEvents(): DomainEvent[] {
    return [
      ...this._domainEvents,
      ...this._chargers.flatMap((c) => c.domainEvents),
    ];
  }
  clearDomainEvents(): void {
    this._domainEvents = [];
    this._chargers.forEach((c) => c.clearDomainEvents());
  }
}
