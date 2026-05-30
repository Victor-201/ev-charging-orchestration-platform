import { IPricingRepository } from "../../domain/repositories/repository.interfaces";
import { PricingInfo } from "../../domain/entities/entities";
import { apiClient } from "../sources/apiClient";
import { StationRepositoryImpl } from "./StationRepositoryImpl";

export class PricingRepositoryImpl implements IPricingRepository {
  private readonly stationRepo = new StationRepositoryImpl();

  async getPricing(
    stationId: string,
    chargerId: string,
    connectorType?: string
  ): Promise<PricingInfo> {
    let resolvedType = connectorType;

    if (!resolvedType && chargerId && stationId) {
      try {
        const chargers = await this.stationRepo.getStationChargers(stationId);
        const matched = chargers.find(c => c.id === chargerId);
        if (matched?.connectors?.length) {
          resolvedType = matched.connectors[0].type || (matched.connectors[0] as any).connectorType;
        }
      } catch (err) {
        console.warn('[Kiosk] Could not dynamically resolve connector type for pricing:', err);
      }
    }

    if (!resolvedType) {
      resolvedType = 'CCS';
    }

    const now = new Date().toISOString();
    const { data } = await apiClient.get<PricingInfo>(
      `/stations/${stationId}/chargers/${chargerId}/pricing`,
      {
        params: {
          connectorType: resolvedType,
          startTime: now,
          endTime: now,
        },
      }
    );
    return data;
  }
}
