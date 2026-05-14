import { InvalidChargerDataException } from '../exceptions/station.exceptions';

/**
 * PowerRating Value Object — kW capacity of the charger/connector
 * Invariant: value MUST be > 0
 */
export class PowerRating {
  readonly kw: number;

  private constructor(kw: number) {
    this.kw = kw;
  }

  static create(kw: number): PowerRating {
    if (typeof kw !== 'number' || isNaN(kw)) {
      throw new InvalidChargerDataException('Power rating must be a valid number');
    }
    if (kw <= 0) {
      throw new InvalidChargerDataException(`Power rating must be > 0 kW, got ${kw}`);
    }
    if (kw > 1000) {
      throw new InvalidChargerDataException(`Power rating ${kw} kW exceeds maximum supported (1000 kW)`);
    }
    return new PowerRating(Math.round(kw * 100) / 100); // round to 2 decimals
  }

  isFastCharger(): boolean { return this.kw >= 50; }
  isUltraFast(): boolean  { return this.kw >= 150; }

  equals(other: PowerRating): boolean { return this.kw === other.kw; }
}
