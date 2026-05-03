import { BookingStatus } from '../../domain/value-objects/booking-status.vo';

export class BookingResponseDto {
  id: string;
  userId: string;
  chargerId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  durationMinutes: number;
  /** QR Token một lần — chỉ có sau khi payment thành công (status = confirmed) */
  qrToken: string | null;
  /** Số tiền cọc (VND) */
  depositAmount: number | null;
  createdAt: Date;
}

export class AvailabilitySlotDto {
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
}

export class SuggestChargerResponseDto {
  chargerId: string;
  stationId: string;
  score: number;
  rank: number;
}

export class QueuePositionResponseDto {
  position: number;
  userId: string;
  chargerId: string;
  estimatedWaitMinutes: number;
}
