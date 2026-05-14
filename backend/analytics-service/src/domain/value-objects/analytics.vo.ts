/**
 * Analytics Domain Value Objects
 *
 * Immutable and self-validating. No side effects.
 */

// TimeBucket

export type TimePeriod = 'hourly' | 'daily' | 'monthly';

/**
 * TimeBucket: Represents a specific time interval.
 * Normalizes timestamps to the start of the bucket for consistent aggregation merging.
 */
export class TimeBucket {
  readonly period:    TimePeriod;
  readonly bucketKey: string;   // 'YYYY-MM-DD', 'YYYY-MM-DD:HH', 'YYYY-MM'
  readonly bucketAt:  Date;

  private constructor(period: TimePeriod, bucketKey: string, bucketAt: Date) {
    this.period    = period;
    this.bucketKey = bucketKey;
    this.bucketAt  = bucketAt;
  }

  /** Creates a TimeBucket from a timestamp and period (UTC-based) */
  static of(ts: Date, period: TimePeriod): TimeBucket {
    const d = new Date(ts);
    switch (period) {
      case 'hourly': {
        d.setUTCMinutes(0, 0, 0);
        const key = `${d.toISOString().split('T')[0]}:${String(d.getUTCHours()).padStart(2, '0')}`;
        return new TimeBucket('hourly', key, d);
      }
      case 'daily': {
        const key = d.toISOString().split('T')[0];
        d.setUTCHours(0, 0, 0, 0);
        return new TimeBucket('daily', key, d);
      }
      case 'monthly': {
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        d.setUTCDate(1);
        d.setUTCHours(0, 0, 0, 0);
        return new TimeBucket('monthly', key, d);
      }
    }
  }

  /** Hour of day (0-23) UTC — consistent with bucket key */
  get hourOfDay(): number {
    return new Date(this.bucketAt).getUTCHours();
  }

  /** Date part string 'YYYY-MM-DD' (UTC) */
  get dateStr(): string {
    return this.bucketAt.toISOString().split('T')[0];
  }
}

// Money

/** VND amount (integer; floating point values are prohibited). */
export class MoneyVnd {
  readonly amountVnd: number;

  constructor(amountVnd: number) {
    if (!Number.isInteger(amountVnd) || amountVnd < 0) {
      throw new Error(`MoneyVnd invalid: ${amountVnd} — must be an integer >= 0`);
    }
    this.amountVnd = amountVnd;
  }

  add(other: MoneyVnd): MoneyVnd {
    return new MoneyVnd(this.amountVnd + other.amountVnd);
  }

  static ZERO = new MoneyVnd(0);
}

// EnergyKwh

/** kWh consumed — 4 decimal places precision. */
export class EnergyKwh {
  readonly value: number;

  constructor(value: number) {
    if (value < 0) throw new Error(`EnergyKwh cannot be negative: ${value}`);
    this.value = Math.round(value * 10000) / 10000; // 4dp
  }

  add(other: EnergyKwh): EnergyKwh {
    return new EnergyKwh(this.value + other.value);
  }

  static ZERO = new EnergyKwh(0);
}

// DurationMinutes

export class DurationMinutes {
  readonly value: number;

  constructor(value: number) {
    if (value < 0) throw new Error(`DurationMinutes cannot be negative: ${value}`);
    this.value = Math.round(value * 100) / 100; // 2dp
  }

  static fromMs(ms: number): DurationMinutes {
    return new DurationMinutes(ms / 60000);
  }

  static ZERO = new DurationMinutes(0);
}
