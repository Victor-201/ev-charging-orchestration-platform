import { IBookingRepository } from "../../domain/repositories/repository.interfaces";
import { AvailabilitySlot } from "../../domain/entities/entities";
import { apiClient } from "../sources/apiClient";

export class BookingRepositoryImpl implements IBookingRepository {
  async getAvailabilitySlots(chargerId: string, date: string): Promise<AvailabilitySlot[]> {
    const { data } = await apiClient.get<AvailabilitySlot[]>('/bookings/availability', {
      params: { chargerId, date },
    });
    return data;
  }
}
