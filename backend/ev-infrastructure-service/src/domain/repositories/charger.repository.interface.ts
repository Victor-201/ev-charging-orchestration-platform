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
  /** Find by PK với connectors loaded */
  findById(id: string): Promise<Charger | null>;

  /** Find all chargers của một station */
  findByStationId(stationId: string): Promise<Charger[]>;

  /** Check externalId tồn tại (OCPP chargepoint_id) */
  existsByExternalId(externalId: string, excludeId?: string): Promise<boolean>;

  /** Count active chargers (không offline/faulted) */
  countByStation(stationId: string): Promise<number>;

  /** Save (INSERT hoặc UPDATE) */
  save(charger: Charger, manager?: EntityManager): Promise<void>;

  /** Soft update status — ghi status + updatedAt */
  updateStatus(chargerId: string, status: ChargerStatus, manager?: EntityManager): Promise<void>;
}
