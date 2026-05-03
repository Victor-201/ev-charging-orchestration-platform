/**
 * Value Object: Telemetry reading từ charger hardware
 *
 * Immutable. Validates sensor ranges tại thời điểm khởi tạo.
 */
export class TelemetryReading {
  readonly powerKw:      number | null;
  readonly meterWh:      number | null;
  readonly socPercent:   number | null;
  readonly temperatureC: number | null;
  readonly errorCode:    string | null;
  readonly voltage:      number | null;
  readonly currentA:     number | null;
  readonly recordedAt:   Date;

  constructor(props: {
    powerKw?:      number;
    meterWh?:      number;
    socPercent?:   number;
    temperatureC?: number;
    errorCode?:    string;
    voltage?:      number;
    currentA?:     number;
    recordedAt?:   Date;
  }) {
    if (props.socPercent !== undefined && (props.socPercent < 0 || props.socPercent > 100)) {
      throw new Error(`SOC phải trong khoảng 0-100, nhận được: ${props.socPercent}`);
    }
    if (props.powerKw !== undefined && props.powerKw < 0) {
      throw new Error(`powerKw không được âm: ${props.powerKw}`);
    }
    if (props.meterWh !== undefined && props.meterWh < 0) {
      throw new Error(`meterWh không được âm: ${props.meterWh}`);
    }

    this.powerKw      = props.powerKw      ?? null;
    this.meterWh      = props.meterWh      ?? null;
    this.socPercent   = props.socPercent   ?? null;
    this.temperatureC = props.temperatureC ?? null;
    this.errorCode    = props.errorCode    ?? null;
    this.voltage      = props.voltage      ?? null;
    this.currentA     = props.currentA     ?? null;
    this.recordedAt   = props.recordedAt   ?? new Date();
  }

  get hasError(): boolean {
    return this.errorCode !== null && this.errorCode.trim().length > 0;
  }

  get isCharging(): boolean {
    return this.powerKw !== null && this.powerKw > 0;
  }
}
