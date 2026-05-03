import { InvalidStationDataException } from '../exceptions/station.exceptions';

/**
 * Location Value Object
 * Immutable, self-validating geographic coordinate
 * Aligns với BCNF: latitude, longitude columns trong stations
 */
export class Location {
  readonly latitude: number;
  readonly longitude: number;

  private constructor(latitude: number, longitude: number) {
    this.latitude = latitude;
    this.longitude = longitude;
  }

  static create(latitude: number, longitude: number): Location {
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      throw new InvalidStationDataException('Latitude must be a valid number');
    }
    if (typeof longitude !== 'number' || isNaN(longitude)) {
      throw new InvalidStationDataException('Longitude must be a valid number');
    }
    if (latitude < -90 || latitude > 90) {
      throw new InvalidStationDataException(`Latitude must be between -90 and 90, got ${latitude}`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new InvalidStationDataException(`Longitude must be between -180 and 180, got ${longitude}`);
    }
    return new Location(latitude, longitude);
  }

  /**
   * Tính khoảng cách Haversine (km) — dùng cho nearby search
   */
  distanceTo(other: Location): number {
    const R = 6371;
    const dLat = this.toRad(other.latitude - this.latitude);
    const dLon = this.toRad(other.longitude - this.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(this.latitude)) *
      Math.cos(this.toRad(other.latitude)) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  equals(other: Location): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }

  private toRad(deg: number): number { return deg * (Math.PI / 180); }
}
