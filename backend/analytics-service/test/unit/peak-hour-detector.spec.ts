/**
 * Tests: PeakHourDetector — Synchronized with OLS Implementation
 *
 * Actual implementation utilizes OLS Linear Regression (regr_slope, regr_intercept, regr_r2).
 * This is NOT EWA. This test accurately reflects the returned SQL schema.
 *
 * Mocks DataSource.query() to return rows with the following schema:
 *   detectForStation: { hour_of_day, data_points, avg_sessions, avg_kwh, avg_duration_min, total_sessions }
 *   forecastNextDay:  { hour_of_day, slope, intercept, r_squared, mean_sessions, last_day, data_points }
 */
import { PeakHourDetector } from '../../src/domain/services/peak-hour-detector';

// Mock DataSource

function makePeakDetector(queryResults: any[][]): PeakHourDetector {
  let callCount = 0;
  const mockDs = {
    query: jest.fn().mockImplementation(() => {
      const result = queryResults[callCount] ?? [];
      callCount++;
      return Promise.resolve(result);
    }),
  };
  return new PeakHourDetector(mockDs as any);
}

// Mock data helpers

function makeHourlyRow(hour: number, avgSessions: number) {
  return {
    hour_of_day:       String(hour),
    data_points:       '10',
    avg_sessions:      String(avgSessions),
    avg_kwh:           '20.0',
    avg_duration_min:  '60.0',
    total_sessions:    String(avgSessions * 10),
  };
}

/** OLS regression row — schema returned from PostgreSQL regr_ functions */
function makeOlsRow(
  hour: number,
  slope: number,
  intercept: number,
  rSquared: number,
  meanSessions = 20,
  dataPoints   = 14,
) {
  return {
    hour_of_day:   String(hour),
    slope:         String(slope),
    intercept:     String(intercept),
    r_squared:     String(rSquared),
    mean_sessions: String(meanSessions),
    last_day:      '28',
    data_points:   String(dataPoints),
  };
}

// Tests: detectForStation

describe('PeakHourDetector', () => {

  describe('detectForStation()', () => {
    it('returns an empty array if no data is present', async () => {
      const detector = makePeakDetector([[]]); // empty rows
      const result   = await detector.detectForStation('station-001');
      expect(result).toEqual([]);
    });

    it('row with the highest avgSessions: rank = 1, isPeak = true', async () => {
      const rows = [
        makeHourlyRow(18, 25),  // busiest: rank 1
        makeHourlyRow(17, 22),  // rank 2
        makeHourlyRow(19, 20),  // rank 3
        makeHourlyRow(8,  10),  // rank 4
        makeHourlyRow(12, 15),  // rank 5
      ];
      const detector = makePeakDetector([rows]);
      const result   = await detector.detectForStation('station-001');

      expect(result[0].rank).toBe(1);
      expect(result[0].hourOfDay).toBe(18);
      expect(result[0].isPeak).toBe(true);   // top 3

      expect(result[1].rank).toBe(2);
      expect(result[1].isPeak).toBe(true);   // top 3

      expect(result[2].rank).toBe(3);
      expect(result[2].isPeak).toBe(true);   // top 3

      expect(result[3].rank).toBe(4);
      expect(result[3].isPeak).toBe(false);  // not in top 3
    });

    it('peakScore of rank-1 = 1.0 (normalized by max)', async () => {
      const rows = [
        makeHourlyRow(18, 20), // max
        makeHourlyRow(12, 10), // half
      ];
      const detector = makePeakDetector([rows]);
      const result   = await detector.detectForStation('station-001');

      expect(result[0].peakScore).toBe(1.0);             // 20/20 = 1.0
      expect(result[1].peakScore).toBeCloseTo(0.5, 2);   // 10/20 = 0.5
    });

    it('parses integer hourOfDay from string', async () => {
      const rows     = [makeHourlyRow(8, 5)];
      const detector = makePeakDetector([rows]);
      const result   = await detector.detectForStation('s-001');

      expect(typeof result[0].hourOfDay).toBe('number');
      expect(result[0].hourOfDay).toBe(8);
    });

    it('peakScore = 0 when maxSessions = 0 (empty data guard)', async () => {
      // Case where avg_sessions = 0 for all rows
      const rows     = [makeHourlyRow(8, 0), makeHourlyRow(12, 0)];
      const detector = makePeakDetector([rows]);
      const result   = await detector.detectForStation('s-001');
      result.forEach((r) => expect(r.peakScore).toBe(0));
    });
  });

  // Tests: forecastNextDay (OLS Linear Regression)

  describe('forecastNextDay() — OLS Linear Regression', () => {

    it('returns an empty array if no regression data is present', async () => {
      const detector = makePeakDetector([[]]);
      const result   = await detector.forecastNextDay('station-001');
      expect(result).toEqual([]);
    });

    it('calculates forecastSessions correctly using OLS: ŷ = intercept + slope * 29', async () => {
      // slope=0.5, intercept=10, next_day_ordinal=29
      // ŷ = 10 + 0.5 * 29 = 10 + 14.5 = 24.5
      const rows = [makeOlsRow(8, 0.5, 10, 0.8, 20, 14)];
      const detector = makePeakDetector([rows]);
      const result   = await detector.forecastNextDay('station-001');

      expect(result[0].hourOfDay).toBe(8);
      expect(result[0].forecastSessions).toBeCloseTo(24.5, 1);
    });

    it('forecastSessions >= 0 even when OLS yields a negative result (floor = 0)', async () => {
      // slope = -2, intercept = 0: ŷ = -58; must clamp to 0
      const rows     = [makeOlsRow(2, -2, 0, 0.6, 10, 14)];
      const detector = makePeakDetector([rows]);
      const result   = await detector.forecastNextDay('s-001');
      expect(result[0].forecastSessions).toBeGreaterThanOrEqual(0);
    });

    it('trend = increasing when slope > 0', async () => {
      const rows     = [makeOlsRow(18, 0.5, 10, 0.7)];  // positive slope
      const detector = makePeakDetector([rows]);
      const result   = await detector.forecastNextDay('s-001');
      expect(result[0].trend).toBe('increasing');
    });

    it('trend = decreasing when slope < 0', async () => {
      const rows     = [makeOlsRow(8, -0.3, 15, 0.5)]; // negative slope
      const detector = makePeakDetector([rows]);
      const result   = await detector.forecastNextDay('s-001');
      expect(result[0].trend).toBe('decreasing');
    });

    it('trend = stable when slope ≈ 0', async () => {
      const rows     = [makeOlsRow(12, 0, 18, 0.9)]; // zero slope
      const detector = makePeakDetector([rows]);
      const result   = await detector.forecastNextDay('s-001');
      expect(result[0].trend).toBe('stable');
    });

    it('low confidence when dataPoints < 14 (data penalty applied)', async () => {
      // dataPoints = 7: penalty = 0.5; confidence is reduced
      const rows     = [makeOlsRow(8, 0.1, 10, 0.8, 20, 7)];
      const detector = makePeakDetector([rows]);
      const result   = await detector.forecastNextDay('s-001');
      // confidence = round(r2 * (7/14) * 100) / 100 = round(0.8 * 0.5 * 100)/100 = 0.4
      expect(result[0].confidence).toBeLessThan(0.8);
    });

    it('high confidence when dataPoints >= 14 and r² is high', async () => {
      // dataPoints=14 → penalty=1.0 → confidence = r² * 1.0
      const rows     = [makeOlsRow(8, 0.1, 10, 0.75, 20, 14)];
      const detector = makePeakDetector([rows]);
      const result   = await detector.forecastNextDay('s-001');
      // confidence = round(0.75 * 1.0 * 100) / 100 = 0.75
      expect(result[0].confidence).toBeCloseTo(0.75, 2);
    });
  });
});
