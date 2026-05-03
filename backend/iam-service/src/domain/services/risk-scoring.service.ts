/**
 * RiskScoringService — Domain Service
 *
 * Tính risk score (0–100) cho một login attempt dựa trên:
 * - IP reputation (blacklist / known proxy)
 * - Device fingerprint match với session cũ
 * - Failed login count gần đây
 *
 * Score thresholds:
 *   0–30   → LOW   (allow normal)
 *   31–60  → MEDIUM (require MFA hoặc log warning)
 *   61–100 → HIGH  (block + flag suspicious)
 */

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface RiskContext {
  ipAddress?: string;
  deviceFingerprint?: string;
  knownDeviceFingerprints: string[];  // previous sessions của user
  recentFailedAttempts: number;        // số lần thất bại trong 15 phút qua
  userAgent?: string;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  reasons: string[];
}

export class RiskScoringService {
  // IP prefixes thường gặp từ proxy/TOR (simplified — trong production dùng MaxMind GeoIP)
  private readonly SUSPICIOUS_IP_PREFIXES = [
    '10.0.0.', // internal — safe
  ];

  calculate(ctx: RiskContext): RiskResult {
    let score = 0;
    const reasons: string[] = [];

    // ── Factor 1: Failed login count ──────────────────────────────────────────
    if (ctx.recentFailedAttempts >= 3 && ctx.recentFailedAttempts < 5) {
      score += 20;
      reasons.push(`${ctx.recentFailedAttempts} recent failed attempts`);
    } else if (ctx.recentFailedAttempts >= 5) {
      score += 40;
      reasons.push(`High failure count: ${ctx.recentFailedAttempts}`);
    }

    // ── Factor 2: Device fingerprint ──────────────────────────────────────────
    if (ctx.deviceFingerprint && ctx.knownDeviceFingerprints.length > 0) {
      const isKnown = ctx.knownDeviceFingerprints.includes(ctx.deviceFingerprint);
      if (!isKnown) {
        score += 25;
        reasons.push('Unknown device fingerprint');
      }
    } else if (!ctx.deviceFingerprint && ctx.knownDeviceFingerprints.length > 0) {
      // No fingerprint provided, but user has previous sessions
      score += 15;
      reasons.push('No device fingerprint provided');
    }

    // ── Factor 3: Suspicious IP (basic) ───────────────────────────────────────
    if (ctx.ipAddress) {
      const isSuspiciousIp = this.checkSuspiciousIp(ctx.ipAddress);
      if (isSuspiciousIp) {
        score += 30;
        reasons.push(`Suspicious IP: ${ctx.ipAddress}`);
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return {
      score,
      level: this.toLevel(score),
      reasons,
    };
  }

  private checkSuspiciousIp(ip: string): boolean {
    // Very basic check: unusual patterns
    // In production: integrate MaxMind GeoIP or AbuseIPDB
    if (ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.')) {
      return false; // local/private
    }
    // Flag IPs with many dots in unusual formats
    const parts = ip.split('.');
    if (parts.length === 4) {
      const lastOctet = parseInt(parts[3], 10);
      // Heuristic: .1 and .255 at scale are often infra abuse
      return false; // Default safe unless real blacklist available
    }
    return false;
  }

  private toLevel(score: number): RiskLevel {
    if (score <= 30) return RiskLevel.LOW;
    if (score <= 60) return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  }
}
