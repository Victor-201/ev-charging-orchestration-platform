import { Inject, Injectable } from '@nestjs/common';
import {
  IChargerRepository,
  CHARGER_REPOSITORY,
} from '../../domain/repositories/charger.repository.interface';
import { SchedulingEngine, ChargerCandidate } from '../../domain/services/scheduling-engine.service';
import { SuggestChargerDto } from '../dtos/booking.dto';
import { SuggestChargerResponseDto } from '../dtos/response.dto';

@Injectable()
export class SuggestChargerUseCase {
  constructor(
    @Inject(CHARGER_REPOSITORY) private readonly chargerRepo: IChargerRepository,
    private readonly schedulingEngine: SchedulingEngine,
  ) {}

  async execute(
    dto: SuggestChargerDto,
    userLat?: number,
    userLng?: number,
  ): Promise<SuggestChargerResponseDto[]> {
    const chargers = await this.chargerRepo.findAvailableByStation(
      undefined as any,
      dto.connectorType,
    );

    const candidates: ChargerCandidate[] = chargers.map((c) => ({
      chargerId: c.id,
      stationId: c.stationId,
      currentLoad: c.status === 'in_use' ? 0.8 : 0.1,
      availableSlots: c.status === 'available' ? 1 : 0,
      distanceKm: userLat && userLng ? this.calcDistance(userLat, userLng) : 5,
    }));

    return this.schedulingEngine.getSuggestions(candidates, 5);
  }

  private calcDistance(lat: number, lng: number): number {
    // Placeholder: replace with PostGIS query via repo
    return Math.random() * 10 + 0.5;
  }
}
