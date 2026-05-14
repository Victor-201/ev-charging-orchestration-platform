import { EntityManager } from 'typeorm';
import { Charger, ChargerStatus } from '../entities/charger.aggregate';

export const CHARGER_REPOSITORY = Symbol('CHARGER_REPOSITORY');

export interface ChargerFilter {
  stationId?: string;
  status?: ChargerStatus;
  connectorType?: string;
  minPowerKw?: number;
}

export interface IChargerRepository {
  /** Finds by primary key with connectors loaded */
  findById(id: string): Promise<Charger | null>;

  /** Finds all chargers associated with a specific station */
  findByStationId(stationId: string): Promise<Charger[]>;

  /** Checks if an externalId (OCPP chargepoint_id) already exists */
  existsByExternalId(externalId: string, excludeId?: string): Promise<boolean>;

  /** Counts active chargers (excluding offline/faulted states) */
  countByStation(stationId: string): Promise<number>;

  /** Saves the charger (INSERT or UPDATE) */
  save(charger: Charger, manager?: EntityManager): Promise<void>;

  /** Soft update of status — updates status and updatedAt timestamp */
  updateStatus(chargerId: string, status: ChargerStatus, manager?: EntityManager): Promise<void>;
}
