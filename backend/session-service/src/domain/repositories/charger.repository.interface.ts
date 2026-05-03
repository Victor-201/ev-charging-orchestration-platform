import { EntityManager } from 'typeorm';

export interface ConnectorInfo {
  connectorType: string;
  maxPowerKw: number;
}

export interface ChargerInfo {
  id: string;
  stationId: string;
  /** Connector chính (primary) */
  connectorType: string;
  /** Tất cả connectors của trụ (1 trụ có thể có nhiều loại) */
  connectors: ConnectorInfo[];
  maxPowerKw: number;
  status: 'available' | 'in_use' | 'offline' | 'reserved' | 'faulted';
}

export interface IChargerRepository {
  findById(id: string): Promise<ChargerInfo | null>;
  findAvailableByStation(stationId: string, connectorType?: string): Promise<ChargerInfo[]>;
  isAvailable(chargerId: string): Promise<boolean>;
  /** Lock row FOR UPDATE inside a transaction */
  lockForUpdate(chargerId: string, manager: EntityManager): Promise<void>;
  updateStatus(chargerId: string, status: ChargerInfo['status']): Promise<void>;
}

export const CHARGER_REPOSITORY = Symbol('CHARGER_REPOSITORY');
