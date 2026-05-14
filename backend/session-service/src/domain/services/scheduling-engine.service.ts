import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChargerCandidate {
  chargerId: string;
  stationId: string;
  currentLoad: number;      // 0.0 - 1.0
  availableSlots: number;
  distanceKm: number;
  isPeakHour?: boolean;
}

export interface ScheduleResult {
  chargerId: string;
  stationId: string;
  score: number;
  rank: number;
}

/**
 * SchedulingEngine - Domain Service
 * score = w1*(1/load) + w2*slots + w3*(1/distance) + w4*peakPenalty
 * Higher score = better candidate
 */
@Injectable()
export class SchedulingEngine {
  private readonly w1: number;
  private readonly w2: number;
  private readonly w3: number;
  private readonly w4: number;

  constructor(private readonly config: ConfigService) {
    this.w1 = parseFloat(config.get('SCORE_W1', '0.35'));
    this.w2 = parseFloat(config.get('SCORE_W2', '0.30'));
    this.w3 = parseFloat(config.get('SCORE_W3', '0.20'));
    this.w4 = parseFloat(config.get('SCORE_W4', '0.15'));
  }

  calculateScore(c: ChargerCandidate): number {
    const peak = c.isPeakHour ?? this.isCurrentlyPeakHour();
    return (
      this.w1 * (1 / (c.currentLoad + 0.01)) +
      this.w2 * c.availableSlots +
      this.w3 * (1 / (c.distanceKm + 0.1)) +
      this.w4 * (peak ? -1 : 0)
    );
  }

  rank(candidates: ChargerCandidate[]): ScheduleResult[] {
    return candidates
      .map((c) => ({
        chargerId: c.chargerId,
        stationId: c.stationId,
        score: this.calculateScore(c),
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));
  }

  getSuggestions(candidates: ChargerCandidate[], limit = 5): ScheduleResult[] {
    return this.rank(candidates).slice(0, limit);
  }

  private isCurrentlyPeakHour(): boolean {
    const h = new Date().getHours();
    return (h >= 7 && h <= 9) || (h >= 17 && h <= 20);
  }
}
