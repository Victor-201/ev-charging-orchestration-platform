/**
 * TelemetryReading — Domain Value Object
 *
 * Represents a single validated telemetry reading from a charger.
 * Immutable after construction.
 */
export class TelemetryReadingVO {
  readonly chargerId:    string;
  readonly sessionId:    string;
  readonly powerKw:      number | null;
  readonly currentA:     number | null;
  readonly voltageV:     number | null;
  readonly meterWh:      number | null;
  readonly socPercent:   number | null;
  readonly temperatureC: number | null;
  readonly errorCode:    string | null;
  readonly recordedAt:   Date;

  constructor(raw: {
    chargerId:    string;
    sessionId:    string;
    powerKw?:     number;
    currentA?:    number;
    voltageV?:    number;
    meterWh?:     number;
    socPercent?:  number;
    temperatureC?: number;
    errorCode?:   string;
    recordedAt?:  Date;
  }) {
    if (!raw.chargerId) throw new Error('chargerId is required');
    if (!raw.sessionId) throw new Error('sessionId is required');

    this.chargerId    = raw.chargerId;
    this.sessionId    = raw.sessionId;
    this.powerKw      = raw.powerKw      ?? null;
    this.currentA     = raw.currentA     ?? null;
    this.voltageV     = raw.voltageV     ?? null;
    this.meterWh      = raw.meterWh      ?? null;
    this.socPercent   = raw.socPercent   ?? null;
    this.temperatureC = raw.temperatureC ?? null;
    this.errorCode    = raw.errorCode    ?? null;
    this.recordedAt   = raw.recordedAt   ?? new Date();
  }

  /** Normalize: clamp out-of-range sensor values */
  normalize(): TelemetryReadingVO {
    return new TelemetryReadingVO({
      chargerId:    this.chargerId,
      sessionId:    this.sessionId,
      powerKw:      this.powerKw      !== null ? Math.max(0, this.powerKw)             : undefined,
      currentA:     this.currentA     !== null ? Math.max(0, this.currentA)            : undefined,
      voltageV:     this.voltageV     !== null ? Math.max(0, this.voltageV)            : undefined,
      meterWh:      this.meterWh      !== null ? Math.max(0, this.meterWh)             : undefined,
      socPercent:   this.socPercent   !== null ? Math.min(100, Math.max(0, this.socPercent)) : undefined,
      temperatureC: this.temperatureC !== null ? Math.min(200, Math.max(-50, this.temperatureC)) : undefined,
      errorCode:    this.errorCode    ?? undefined,
      recordedAt:   this.recordedAt,
    });
  }

  /** Validate sensor readings are within physically plausible ranges */
  validate(): string[] {
    const errors: string[] = [];
    if (this.powerKw !== null && (this.powerKw < 0 || this.powerKw > 500)) {
      errors.push(`powerKw=${this.powerKw} out of range [0, 500]`);
    }
    if (this.voltageV !== null && (this.voltageV < 0 || this.voltageV > 1000)) {
      errors.push(`voltageV=${this.voltageV} out of range [0, 1000]`);
    }
    if (this.socPercent !== null && (this.socPercent < 0 || this.socPercent > 100)) {
      errors.push(`socPercent=${this.socPercent} out of range [0, 100]`);
    }
    return errors;
  }
}
