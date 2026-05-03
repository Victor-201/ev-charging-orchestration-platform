import { EntityManager } from 'typeorm';
import { Station, StationStatus } from '../entities/station.aggregate';

export const STATION_REPOSITORY = Symbol('STATION_REPOSITORY');

export interface StationFilter {
  cityId?: string;
  status?: StationStatus;
  ownerId?: string;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CityReadModel {
  id: string;
  cityName: string;
  region: string;
  countryCode: string;
}

export interface IStationRepository {
  /** Find by PK — trả null nếu không thấy */
  findById(id: string): Promise<Station | null>;

  /** Find with chargers loaded */
  findByIdWithChargers(id: string): Promise<Station | null>;

  /** List + filter + pagination */
  findMany(filter: StationFilter): Promise<PaginatedResult<Station>>;

  /** Check duplicate geo */
  existsByGeo(latitude: number, longitude: number, excludeId?: string): Promise<boolean>;

  /** Persist (INSERT or UPDATE) */
  save(station: Station, manager?: EntityManager): Promise<void>;

  /** Find city by id */
  findCityById(cityId: string): Promise<CityReadModel | null>;

  /** List all cities */
  findAllCities(): Promise<CityReadModel[]>;
}
