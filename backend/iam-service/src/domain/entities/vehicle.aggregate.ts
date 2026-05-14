import * as crypto from 'crypto';
import { DomainEvent } from '../events/user.events';
import {
  VehicleRegisteredEvent, VehicleDeletedEvent, PrimaryVehicleChangedEvent,
} from '../events/user.events';
import { VehicleOwnershipException } from '../exceptions/user.exceptions';

export enum VehicleStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export interface VehicleModelInfo {
  id: string;
  brand: string;
  modelName: string;
  year: number;
  batteryCapacityKwh: number | null;
  usableCapacityKwh: number | null;
  defaultChargePort: string | null;
  maxAcPowerKw: number | null;
  maxDcPowerKw: number | null;
}

/**
 * Vehicle Aggregate Root — user-service bounded context
 * Owns: plate_number, color, isPrimary, status, version
 * version: optimistic concurrency control
 */
export class Vehicle {
  private _status: VehicleStatus;
  private _isPrimary: boolean;
  private _color: string | null;
  private _updatedAt: Date;
  private _deletedAt: Date | null;
  private _version: number;
  private _domainEvents: DomainEvent[] = [];

  readonly id: string;
  readonly ownerId: string;
  readonly modelId: string;
  readonly plateNumber: string;
  readonly createdAt: Date;
  readonly model?: VehicleModelInfo;

  private constructor(props: {
    id: string;
    ownerId: string;
    modelId: string;
    plateNumber: string;
    color: string | null;
    status: VehicleStatus;
    isPrimary: boolean;
    version?: number;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    model?: VehicleModelInfo;
  }) {
    this.id = props.id;
    this.ownerId = props.ownerId;
    this.modelId = props.modelId;
    this.plateNumber = props.plateNumber.toUpperCase().trim();
    this._color = props.color;
    this._status = props.status;
    this._isPrimary = props.isPrimary;
    this._version = props.version ?? 1;
    this._deletedAt = props.deletedAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this.model = props.model;
  }

  static create(props: {
    ownerId: string;
    modelId: string;
    plateNumber: string;
    color?: string;
    isPrimary?: boolean;
  }): Vehicle {
    const vehicle = new Vehicle({
      id: crypto.randomUUID(),
      ownerId: props.ownerId,
      modelId: props.modelId,
      plateNumber: props.plateNumber,
      color: props.color ?? null,
      status: VehicleStatus.ACTIVE,
      isPrimary: props.isPrimary ?? false,
      version: 1,
      deletedAt: null,
    });
    vehicle._domainEvents.push(
      new VehicleRegisteredEvent(vehicle.id, vehicle.ownerId, vehicle.plateNumber),
    );
    return vehicle;
  }

  static reconstitute(props: {
    id: string;
    ownerId: string;
    modelId: string;
    plateNumber: string;
    color: string | null;
    status: VehicleStatus;
    isPrimary: boolean;
    version?: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    model?: VehicleModelInfo;
  }): Vehicle {
    return new Vehicle(props);
  }

  assertOwnership(userId: string): void {
    if (this.ownerId !== userId) throw new VehicleOwnershipException();
  }

  softDelete(userId: string): void {
    this.assertOwnership(userId);
    this._status = VehicleStatus.DELETED;
    this._isPrimary = false;
    this._deletedAt = new Date();
    this._updatedAt = new Date();
    this._version += 1;
    this._domainEvents.push(new VehicleDeletedEvent(this.id, this.ownerId));
  }

  setPrimary(): void {
    this._isPrimary = true;
    this._updatedAt = new Date();
    this._version += 1;
    this._domainEvents.push(new PrimaryVehicleChangedEvent(this.id, this.ownerId));
  }

  unsetPrimary(): void {
    this._isPrimary = false;
    this._updatedAt = new Date();
  }

  updateColor(color: string | null): void {
    this._color = color;
    this._updatedAt = new Date();
    this._version += 1;
  }

  bumpVersion(): void {
    this._version += 1;
    this._updatedAt = new Date();
  }

  get status(): VehicleStatus { return this._status; }
  get isPrimary(): boolean { return this._isPrimary; }
  get color(): string | null { return this._color; }
  get isActive(): boolean { return this._status === VehicleStatus.ACTIVE; }
  get updatedAt(): Date { return this._updatedAt; }
  get deletedAt(): Date | null { return this._deletedAt; }
  get version(): number { return this._version; }
  get domainEvents(): DomainEvent[] { return [...this._domainEvents]; }
  clearDomainEvents(): void { this._domainEvents = []; }
}
