import { IStationRepository } from "../../domain/repositories/repository.interfaces";
import { StationDetail, ChargerInfo, StationListResponse } from "../../domain/entities/entities";
import { apiClient } from "../sources/apiClient";

export class StationRepositoryImpl implements IStationRepository {
  async getStationDetail(stationId: string): Promise<StationDetail> {
    const { data } = await apiClient.get<StationDetail>(`/stations/${stationId}`);
    return data;
  }

  async getStationChargers(stationId: string): Promise<ChargerInfo[]> {
    const { data } = await apiClient.get<ChargerInfo[]>(`/stations/${stationId}/chargers`);
    return data;
  }

  async getAllStations(): Promise<StationListResponse> {
    const limit = 100;
    let offset = 0;
    let allItems: StationDetail[] = [];
    let total = 0;
    do {
      const { data } = await apiClient.get<StationListResponse>('/stations', {
        params: { limit, offset },
      });
      allItems = allItems.concat(data.items || []);
      total = data.total;
      offset += limit;
    } while (allItems.length < total);
    return { items: allItems, total, limit, offset };
  }
}
