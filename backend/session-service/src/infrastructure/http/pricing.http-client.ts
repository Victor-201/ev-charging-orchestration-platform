import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface PricingQuote {
  stationId:            string;
  chargerId:            string;
  connectorType:        string;
  pricePerKwhVnd:       number;
  pricePerMinuteVnd:    number;
  isPeakHour:           boolean;
  isOffPeakHour:        boolean;
  estimatedTotalVnd:    number;
  recommendedDepositVnd: number;
  ruleId:               string | null;
  currency:             string;
}

/**
 * PricingHttpClient
 *
 * HTTP client used to fetch prices from station-service.
 * Booking-service calls this to dynamically calculate depositAmount before creating a booking.
 *
 * Base URL từ env: STATION_SERVICE_URL (default: http://station-service:3003)
 */
@Injectable()
export class PricingHttpClient {
  private readonly logger = new Logger(PricingHttpClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get('STATION_SERVICE_URL', 'http://station-service:3003');
  }

  async getPricing(opts: {
    stationId:     string;
    chargerId:     string;
    connectorType: string;
    startTime:     Date;
    endTime:       Date;
  }): Promise<PricingQuote> {
    const url = `${this.baseUrl}/api/v1/stations/${opts.stationId}/chargers/${opts.chargerId}/pricing`;
    const params = {
      connectorType: opts.connectorType,
      startTime:     opts.startTime.toISOString(),
      endTime:       opts.endTime.toISOString(),
    };

    try {
      const resp = await firstValueFrom(
        this.http.get(url, { params, timeout: 3000 }),
      );
      const data = resp.data as PricingQuote;
      this.logger.debug(
        `Pricing: charger=${opts.chargerId} connector=${opts.connectorType} ` +
        `price=${data.pricePerKwhVnd}VND/kWh deposit=${data.recommendedDepositVnd}VND`,
      );
      return data;
    } catch (err: any) {
      this.logger.error(
        `Pricing HTTP error (charger=${opts.chargerId}): ${err.message}. Using fallback.`,
      );
      // Fallback: if station-service is unavailable, use default prices
      return this.fallbackPricing(opts);
    }
  }

  /** Fallback when station-service is unavailable */
  private fallbackPricing(opts: {
    chargerId:     string;
    stationId:     string;
    connectorType: string;
    startTime:     Date;
    endTime:       Date;
  }): PricingQuote {
    const MIN_DEPOSIT = 50_000;
    const hour = opts.startTime.getHours();
    const isPeak     = (hour >= 9 && hour < 12) || (hour >= 17 && hour < 20);
    const isOffPeak  = hour >= 22 || hour < 6;
    const pricePerKwhVnd = isPeak ? 4_500 : isOffPeak ? 2_500 : 3_500;
    const durationHours  = (opts.endTime.getTime() - opts.startTime.getTime()) / 3_600_000;
    const estimatedKwh   = durationHours * 22 * 0.85; // 22kW AC fallback
    const estimatedTotal = Math.ceil(estimatedKwh * pricePerKwhVnd);
    const deposit        = Math.max(Math.ceil(estimatedTotal * 1.2), MIN_DEPOSIT);

    return {
      stationId:             opts.stationId,
      chargerId:             opts.chargerId,
      connectorType:         opts.connectorType,
      pricePerKwhVnd,
      pricePerMinuteVnd:     0,
      isPeakHour:            isPeak,
      isOffPeakHour:         isOffPeak,
      estimatedTotalVnd:     estimatedTotal,
      recommendedDepositVnd: deposit,
      ruleId:                null,
      currency:              'VND',
    };
  }
}
