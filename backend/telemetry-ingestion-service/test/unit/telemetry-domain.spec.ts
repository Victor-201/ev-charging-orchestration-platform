/**
 * Tests: TelemetryReadingVO + TelemetryBuffer
 *
 * Pure unit tests — không cần DB, không cần RabbitMQ.
 * Test domain VO validation, normalization, và buffer batching logic.
 */
import { TelemetryReadingVO } from '../../src/domain/value-objects/telemetry-reading.vo';
import { TelemetryBuffer } from '../../src/application/use-cases/ingest-telemetry.use-case';

// ─── TelemetryReadingVO Tests ─────────────────────────────────────────────────

describe('TelemetryReadingVO', () => {

  function makeReading(overrides?: Partial<any>): TelemetryReadingVO {
    return new TelemetryReadingVO({
      chargerId:   'charger-001',
      sessionId:   'session-abc',
      powerKw:     22.5,
      currentA:    32.0,
      voltageV:    230.0,
      meterWh:     45000,
      socPercent:  75,
      temperatureC: 38,
      ...overrides,
    });
  }

  describe('Constructor', () => {
    it('tạo VO với đầy đủ fields', () => {
      const r = makeReading();
      expect(r.chargerId).toBe('charger-001');
      expect(r.sessionId).toBe('session-abc');
      expect(r.powerKw).toBe(22.5);
      expect(r.socPercent).toBe(75);
    });

    it('fields optional → null khi không truyền', () => {
      const r = new TelemetryReadingVO({ chargerId: 'c-1', sessionId: 's-1' });
      expect(r.powerKw).toBeNull();
      expect(r.currentA).toBeNull();
      expect(r.voltageV).toBeNull();
      expect(r.meterWh).toBeNull();
      expect(r.socPercent).toBeNull();
      expect(r.temperatureC).toBeNull();
      expect(r.errorCode).toBeNull();
    });

    it('throw nếu chargerId trống', () => {
      expect(() => new TelemetryReadingVO({ chargerId: '', sessionId: 's-1' }))
        .toThrow('chargerId is required');
    });

    it('throw nếu sessionId trống', () => {
      expect(() => new TelemetryReadingVO({ chargerId: 'c-1', sessionId: '' }))
        .toThrow('sessionId is required');
    });

    it('recordedAt defaults to now khi không truyền', () => {
      const before = new Date();
      const r = makeReading();
      const after  = new Date();
      expect(r.recordedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(r.recordedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('validate()', () => {
    it('trả về [] khi tất cả values hợp lệ', () => {
      const errors = makeReading().validate();
      expect(errors).toHaveLength(0);
    });

    it('powerKw < 0 → error', () => {
      const r = makeReading({ powerKw: -5 });
      expect(r.validate()).toEqual(expect.arrayContaining([expect.stringMatching(/powerKw.*out of range/)]));
    });

    it('powerKw > 500 → error', () => {
      const r = makeReading({ powerKw: 600 });
      expect(r.validate()).toEqual(expect.arrayContaining([expect.stringMatching(/powerKw.*out of range/)]));
    });

    it('voltageV > 1000 → error', () => {
      const r = makeReading({ voltageV: 1500 });
      expect(r.validate()).toEqual(expect.arrayContaining([expect.stringMatching(/voltageV.*out of range/)]));
    });

    it('socPercent > 100 → error', () => {
      const r = makeReading({ socPercent: 110 });
      expect(r.validate()).toEqual(expect.arrayContaining([expect.stringMatching(/socPercent.*out of range/)]));
    });

    it('socPercent = 0 → valid (empty battery)', () => {
      const r = makeReading({ socPercent: 0 });
      expect(r.validate()).toHaveLength(0);
    });

    it('null values → bỏ qua validation (không lỗi)', () => {
      const r = new TelemetryReadingVO({ chargerId: 'c', sessionId: 's' });
      expect(r.validate()).toHaveLength(0);
    });
  });

  describe('normalize()', () => {
    it('powerKw âm → clamp về 0', () => {
      const r = makeReading({ powerKw: -10 }).normalize();
      expect(r.powerKw).toBe(0);
    });

    it('socPercent > 100 → clamp về 100', () => {
      const r = makeReading({ socPercent: 150 }).normalize();
      expect(r.socPercent).toBe(100);
    });

    it('temperatureC > 200 → clamp về 200', () => {
      const r = makeReading({ temperatureC: 999 }).normalize();
      expect(r.temperatureC).toBe(200);
    });

    it('temperatureC < -50 → clamp về -50', () => {
      const r = makeReading({ temperatureC: -100 }).normalize();
      expect(r.temperatureC).toBe(-50);
    });

    it('values hợp lệ → không thay đổi sau normalize', () => {
      const r = makeReading({ powerKw: 11.0, socPercent: 60 }).normalize();
      expect(r.powerKw).toBe(11.0);
      expect(r.socPercent).toBe(60);
    });

    it('normalize() trả về VO mới (immutable)', () => {
      const original   = makeReading({ powerKw: -5 });
      const normalized = original.normalize();
      expect(normalized).not.toBe(original);
      expect(original.powerKw).toBe(-5);    // original unchanged
      expect(normalized.powerKw).toBe(0);   // normalized clamped
    });
  });
});

// ─── TelemetryBuffer Tests ────────────────────────────────────────────────────

describe('TelemetryBuffer', () => {

  function makeBuffer(): TelemetryBuffer {
    return new TelemetryBuffer();
  }

  function makeVO(chargerId = 'c-1', sessionId = 's-1'): TelemetryReadingVO {
    return new TelemetryReadingVO({ chargerId, sessionId, powerKw: 10 });
  }

  it('push() → trả về null khi buffer chưa đủ BATCH_SIZE (10)', () => {
    const buf = makeBuffer();
    for (let i = 0; i < 9; i++) {
      expect(buf.push(makeVO())).toBeNull();
    }
  });

  it('push() → trả về batch khi đủ 10 readings', () => {
    const buf = makeBuffer();
    let result: any = null;
    for (let i = 0; i < 10; i++) {
      result = buf.push(makeVO());
    }
    expect(result).not.toBeNull();
    expect(result).toHaveLength(10);
  });

  it('buffer reset về [] sau khi flush (auto)', () => {
    const buf = makeBuffer();
    for (let i = 0; i < 10; i++) buf.push(makeVO());
    // After auto-flush, push another should start fresh
    const r = buf.push(makeVO());
    expect(r).toBeNull(); // only 1 reading — not flushed yet
  });

  it('flush() thủ công lấy tất cả readings chưa đầy batch', () => {
    const buf = makeBuffer();
    buf.push(makeVO());
    buf.push(makeVO());
    buf.push(makeVO());

    const flushed = buf.flush('c-1');
    expect(flushed).toHaveLength(3);
  });

  it('flush() trả về [] khi không có data', () => {
    const buf = makeBuffer();
    expect(buf.flush('unknown-charger')).toHaveLength(0);
  });

  it('buffers per chargerId độc lập', () => {
    const buf = makeBuffer();
    buf.push(makeVO('c-A', 's-1'));
    buf.push(makeVO('c-A', 's-1'));
    buf.push(makeVO('c-B', 's-2'));

    expect(buf.flush('c-A')).toHaveLength(2);
    expect(buf.flush('c-B')).toHaveLength(1);
  });

  it('flushAll() trả về tất cả charger buffers cùng lúc', () => {
    const buf = makeBuffer();
    buf.push(makeVO('c-X', 's-1'));
    buf.push(makeVO('c-X', 's-1'));
    buf.push(makeVO('c-Y', 's-2'));

    const all = buf.flushAll();
    expect(all.size).toBe(2);
    expect(all.get('c-X')).toHaveLength(2);
    expect(all.get('c-Y')).toHaveLength(1);
  });

  it('flushAll() reset tất cả buffers', () => {
    const buf = makeBuffer();
    buf.push(makeVO('c-X', 's-1'));
    buf.flushAll();

    const all = buf.flushAll();
    expect(all.size).toBe(0);
  });
});
