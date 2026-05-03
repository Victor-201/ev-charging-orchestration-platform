/**
 * Domain exceptions cho station-service
 * Error codes align với HTTP status conventions
 */

export class StationNotFoundException extends Error {
  readonly code = 'STATION_NOT_FOUND';
  readonly statusCode = 404;
  constructor(stationId: string) {
    super(`Station '${stationId}' not found`);
    this.name = 'StationNotFoundException';
  }
}

export class ChargerNotFoundException extends Error {
  readonly code = 'CHARGER_NOT_FOUND';
  readonly statusCode = 404;
  constructor(chargerId: string) {
    super(`Charger '${chargerId}' not found`);
    this.name = 'ChargerNotFoundException';
  }
}

export class CityNotFoundException extends Error {
  readonly code = 'CITY_NOT_FOUND';
  readonly statusCode = 404;
  constructor(cityId: string) {
    super(`City '${cityId}' not found`);
    this.name = 'CityNotFoundException';
  }
}

export class InvalidStationDataException extends Error {
  readonly code = 'INVALID_STATION_DATA';
  readonly statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStationDataException';
  }
}

export class InvalidChargerDataException extends Error {
  readonly code = 'INVALID_CHARGER_DATA';
  readonly statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = 'InvalidChargerDataException';
  }
}

export class DuplicateGeoLocationException extends Error {
  readonly code = 'DUPLICATE_GEO_LOCATION';
  readonly statusCode = 409;
  constructor(lat: number, lng: number) {
    super(`A station already exists at coordinates (${lat}, ${lng})`);
    this.name = 'DuplicateGeoLocationException';
  }
}

export class DuplicateExternalIdException extends Error {
  readonly code = 'DUPLICATE_EXTERNAL_ID';
  readonly statusCode = 409;
  constructor(externalId: string) {
    super(`Charger with externalId '${externalId}' already exists`);
    this.name = 'DuplicateExternalIdException';
  }
}

export class InvalidStatusTransitionException extends Error {
  readonly code = 'INVALID_STATUS_TRANSITION';
  readonly statusCode = 422;
  constructor(from: string, to: string) {
    super(`Cannot transition charger status from '${from}' to '${to}'`);
    this.name = 'InvalidStatusTransitionException';
  }
}

export class StationNotActiveException extends Error {
  readonly code = 'STATION_NOT_ACTIVE';
  readonly statusCode = 409;
  constructor(stationId: string) {
    super(`Station '${stationId}' is not active`);
    this.name = 'StationNotActiveException';
  }
}

export class MaintenanceTimeConflictException extends Error {
  readonly code = 'MAINTENANCE_TIME_CONFLICT';
  readonly statusCode = 422;
  constructor() {
    super('Maintenance end_time must be after start_time');
    this.name = 'MaintenanceTimeConflictException';
  }
}
