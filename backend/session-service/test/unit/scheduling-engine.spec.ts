import { SchedulingEngine, ChargerCandidate } from '../../src/domain/services/scheduling-engine.service';
import { ConfigService } from '@nestjs/config';

const makeCandidate = (overrides: Partial<ChargerCandidate> = {}): ChargerCandidate => ({
  chargerId: `charger-${Math.random()}`,
  stationId: 'station-1',
  currentLoad: 0.5,
  availableSlots: 2,
  distanceKm: 3,
  isPeakHour: false,
  ...overrides,
});

describe('SchedulingEngine', () => {
  let engine: SchedulingEngine;

  beforeEach(() => {
    engine = new SchedulingEngine(new ConfigService());
  });

  it('calculates higher score for lower load', () => {
    const lowLoad = engine.calculateScore(makeCandidate({ currentLoad: 0.1 }));
    const highLoad = engine.calculateScore(makeCandidate({ currentLoad: 0.9 }));
    expect(lowLoad).toBeGreaterThan(highLoad);
  });

  it('calculates higher score for more available slots', () => {
    const many = engine.calculateScore(makeCandidate({ availableSlots: 5 }));
    const few  = engine.calculateScore(makeCandidate({ availableSlots: 1 }));
    expect(many).toBeGreaterThan(few);
  });

  it('calculates higher score for closer charger', () => {
    const close = engine.calculateScore(makeCandidate({ distanceKm: 0.5 }));
    const far   = engine.calculateScore(makeCandidate({ distanceKm: 20 }));
    expect(close).toBeGreaterThan(far);
  });

  it('penalizes peak hour', () => {
    const offPeak = engine.calculateScore(makeCandidate({ isPeakHour: false }));
    const peak    = engine.calculateScore(makeCandidate({ isPeakHour: true }));
    expect(offPeak).toBeGreaterThan(peak);
  });

  it('rank() returns results sorted descending by score', () => {
    const candidates = [
      makeCandidate({ chargerId: 'A', currentLoad: 0.9, availableSlots: 1 }),
      makeCandidate({ chargerId: 'B', currentLoad: 0.1, availableSlots: 5 }),
      makeCandidate({ chargerId: 'C', currentLoad: 0.5, availableSlots: 3 }),
    ];
    const ranked = engine.rank(candidates);
    expect(ranked[0].chargerId).toBe('B');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
    // Scores should be descending
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
    }
  });

  it('getSuggestions returns at most `limit` results', () => {
    const candidates = Array.from({ length: 10 }, () => makeCandidate());
    const results = engine.getSuggestions(candidates, 3);
    expect(results).toHaveLength(3);
  });
});
