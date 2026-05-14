import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, ChargerAddedEvent, ChargerStatusChangedEvent } from '../events/station.events';
import {
  InvalidChargerDataException,
  InvalidStatusTransitionException,
} from '../exceptions/station.exceptions';
import { PowerRating } from '../value-objects/power-rating.vo';

/**
 * ConnectorType — EXACTLY aligned with SQL ENUM connector_type
 * DO NOT change — these values are stored in DB
 */
export enum ConnectorType {
  CCS      = 'CCS',
  CHADEMO  = 'CHAdeMO',
  TYPE2    = 'Type2',
  GBT      = 'GB/T',
  OTHER    = 'Other',
}

/**
 * ChargerStatus — aligned with SQL ENUM charger_status
 * DO NOT add MAINTENANCE — not present in SQL
 */
export enum ChargerStatus {
  AVAILABLE = 'available',
  IN_USE    = 'in_use',
  OFFLINE   = 'offline',
  FAULTED   = 'faulted',
  RESERVED  = 'reserved',
}

/**
 * Connector Value — ports of a ChargePoint
 * Each charging_point can have multiple connector types
 */
export interface ConnectorProps {
  id: string;
  chargingPointId: string;
  connectorType: ConnectorType;
  maxPowerKw: number | null;
}

/**
 * Charger Aggregate (ChargingPoint)
 * Owns: connectors list, status FSM
 * Invariants:
 * - maxPowerKw > 0
 * - status transitions follow FSM
 * - belongs to exactly ONE station
 * Aligned with: charging_points table in station_db.sql
 */
export class Charger {
  readonly id: string;
  readonly stationId: string;
  readonly name: string;
  readonly externalId: string | null; // OCPP chargepoint_id
  readonly maxPowerKw: number;
  readonly createdAt: Date;
  private _status: ChargerStatus;
  private _updatedAt: Date;
  private _connectors: ConnectorProps[];
  private _domainEvents: DomainEvent[] = [];

  // Status FSM
  // available → in_use, reserved, offline, faulted
  // in_use    → available, faulted, offline
  // reserved  → available, in_use, offline
  // offline   → available, faulted
  // faulted   → offline, available (after repair)
  private static readonly VALID_TRANSITIONS: Record<ChargerStatus, ChargerStatus[]> = {
    [ChargerStatus.AVAILABLE]: [ChargerStatus.IN_USE, ChargerStatus.RESERVED, ChargerStatus.OFFLINE, ChargerStatus.FAULTED],
    [ChargerStatus.IN_USE]:    [ChargerStatus.AVAILABLE, ChargerStatus.FAULTED, ChargerStatus.OFFLINE],
    [ChargerStatus.RESERVED]:  [ChargerStatus.AVAILABLE, ChargerStatus.IN_USE, ChargerStatus.OFFLINE],
    [ChargerStatus.OFFLINE]:   [ChargerStatus.AVAILABLE, ChargerStatus.FAULTED],
    [ChargerStatus.FAULTED]:   [ChargerStatus.OFFLINE, ChargerStatus.AVAILABLE],
  };

  private constructor(props: {
    id: string;
    stationId: string;
    name: string;
    externalId: string | null;
    maxPowerKw: number;
    status: ChargerStatus;
    connectors: ConnectorProps[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this.stationId = props.stationId;
    this.name = props.name;
    this.externalId = props.externalId;
    this.maxPowerKw = props.maxPowerKw;
    this._status = props.status;
    this._connectors = props.connectors;
    this.createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  // Factory Methods

  /**
   * Creates a new charger — validates and emits ChargerAddedEvent
   */
  static create(props: {
    stationId: string;
    name: string;
    externalId?: string;
    maxPowerKw: number;
    connectors?: { connectorType: ConnectorType; maxPowerKw?: number }[];
  }): Charger {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidChargerDataException('Charger name is required');
    }
    // Validate power via value object
    const powerRating = PowerRating.create(props.maxPowerKw);

    const id = uuidv4();
    const connectors: ConnectorProps[] = (props.connectors ?? []).map((c) => ({
      id: uuidv4(),
      chargingPointId: id,
      connectorType: c.connectorType,
      maxPowerKw: c.maxPowerKw ?? null,
    }));

    const charger = new Charger({
      id,
      stationId: props.stationId,
      name: props.name.trim(),
      externalId: props.externalId?.trim() ?? null,
      maxPowerKw: powerRating.kw,
      status: ChargerStatus.AVAILABLE,
      connectors,
    });

    charger._domainEvents.push(
      new ChargerAddedEvent(charger.id, charger.stationId, charger.name, charger.maxPowerKw),
    );
    return charger;
  }

  /**
   * Reconstitutes from persistence — does not emit domain events
   */
  static reconstitute(props: {
    id: string;
    stationId: string;
    name: string;
    externalId: string | null;
    maxPowerKw: number;
    status: ChargerStatus;
    connectors: ConnectorProps[];
    createdAt: Date;
    updatedAt: Date;
  }): Charger {
    return new Charger(props);
  }

  // Domain Behaviors

  /**
   * FSM-validated status transition
   */
  updateStatus(newStatus: ChargerStatus): void {
    const allowed = Charger.VALID_TRANSITIONS[this._status];
    if (!allowed.includes(newStatus)) {
      throw new InvalidStatusTransitionException(this._status, newStatus);
    }
    const previous = this._status;
    this._status = newStatus;
    this._updatedAt = new Date();
    this._domainEvents.push(
      new ChargerStatusChangedEvent(this.id, this.stationId, previous, newStatus),
    );
  }

  isAvailable(): boolean { return this._status === ChargerStatus.AVAILABLE; }

  // Getters

  get status(): ChargerStatus      { return this._status; }
  get updatedAt(): Date            { return this._updatedAt; }
  get connectors(): ConnectorProps[] { return [...this._connectors]; }
  get domainEvents(): DomainEvent[] { return [...this._domainEvents]; }
  clearDomainEvents(): void        { this._domainEvents = []; }
}
