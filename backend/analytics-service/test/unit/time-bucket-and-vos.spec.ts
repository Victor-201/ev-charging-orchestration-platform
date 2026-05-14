/**
 * Tests: AggregationEngine + TimeBucket VO
 *
 * Pure unit tests using mocked DataSource. Verifies precise aggregation logic.
 */
import { TimeBucket } from '../../src/domain/value-objects/analytics.vo';
import { MoneyVnd, EnergyKwh, DurationMinutes } from '../../src/domain/value-objects/analytics.vo';

// TimeBucket VO

describe('TimeBucket Value Object', () => {

  const ts = new Date('2026-04-12T14:35:00Z');

  it('daily bucket: normalizes to start of day', () => {
    const bucket = TimeBucket.of(ts, 'daily');
    expect(bucket.period).toBe('daily');
    expect(bucket.dateStr).toBe('2026-04-12');
    expect(bucket.bucketKey).toBe('2026-04-12');
  });

  it('hourly bucket: normalizes to start of hour', () => {
    const bucket = TimeBucket.of(ts, 'hourly');
    expect(bucket.period).toBe('hourly');
    expect(bucket.bucketKey).toBe('2026-04-12:14');
    expect(bucket.hourOfDay).toBe(14);
  });

  it('monthly bucket: normalizes to start of month', () => {
    const bucket = TimeBucket.of(ts, 'monthly');
    expect(bucket.period).toBe('monthly');
    expect(bucket.bucketKey).toBe('2026-04');
    expect(bucket.dateStr).toMatch(/^2026-04/);
  });

  it('hourly bucket: timestamps within the same hour share the same bucketKey', () => {
    const t1 = new Date('2026-04-12T14:00:00Z');
    const t2 = new Date('2026-04-12T14:59:59Z');
    expect(TimeBucket.of(t1, 'hourly').bucketKey).toBe(TimeBucket.of(t2, 'hourly').bucketKey);
  });

  it('hourly bucket: different hours result in distinct bucketKeys', () => {
    const t1 = new Date('2026-04-12T14:00:00Z');
    const t2 = new Date('2026-04-12T15:00:00Z');
    expect(TimeBucket.of(t1, 'hourly').bucketKey).not.toBe(TimeBucket.of(t2, 'hourly').bucketKey);
  });

  it('peak hour detection: hourOfDay is consistent with timezone', () => {
    const midnight = new Date('2026-04-12T00:00:00Z');
    const noon     = new Date('2026-04-12T12:00:00Z');
    expect(TimeBucket.of(midnight, 'hourly').hourOfDay).toBe(0);
    expect(TimeBucket.of(noon, 'hourly').hourOfDay).toBe(12);
  });
});

// MoneyVnd VO

describe('MoneyVnd Value Object', () => {
  it('creates a valid MoneyVnd instance', () => {
    const m = new MoneyVnd(100000);
    expect(m.amountVnd).toBe(100000);
  });

  it('MoneyVnd.ZERO = 0', () => {
    expect(MoneyVnd.ZERO.amountVnd).toBe(0);
  });

  it('adds two MoneyVnd instances', () => {
    const a = new MoneyVnd(50000);
    const b = new MoneyVnd(75000);
    expect(a.add(b).amountVnd).toBe(125000);
  });

  it('throws on negative value', () => {
    expect(() => new MoneyVnd(-1)).toThrow();
  });

  it('throws on non-integer value', () => {
    expect(() => new MoneyVnd(100.5)).toThrow();
  });
});

// EnergyKwh VO

describe('EnergyKwh Value Object', () => {
  it('creates a valid EnergyKwh instance with 4dp precision', () => {
    const e = new EnergyKwh(15.12345); // round to 4dp
    expect(e.value).toBeCloseTo(15.1235, 4);
  });

  it('adds two EnergyKwh instances', () => {
    const a = new EnergyKwh(10.5);
    const b = new EnergyKwh(5.25);
    expect(a.add(b).value).toBeCloseTo(15.75, 4);
  });

  it('throws on negative value', () => {
    expect(() => new EnergyKwh(-0.001)).toThrow();
  });

  it('EnergyKwh.ZERO = 0', () => {
    expect(EnergyKwh.ZERO.value).toBe(0);
  });
});

// DurationMinutes VO

describe('DurationMinutes Value Object', () => {
  it('fromMs: correctly converts milliseconds to minutes', () => {
    const d = DurationMinutes.fromMs(90 * 60 * 1000); // 90 minutes
    expect(d.value).toBeCloseTo(90, 2);
  });

  it('fromMs: 1.5 hours equals 90 minutes', () => {
    const d = DurationMinutes.fromMs(1.5 * 3600 * 1000);
    expect(d.value).toBeCloseTo(90, 2);
  });

  it('throws on negative value', () => {
    expect(() => new DurationMinutes(-1)).toThrow();
  });
});
