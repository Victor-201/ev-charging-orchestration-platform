import {
  IsDateString, IsUUID, IsString, IsOptional,
  IsNumber, Min, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Các loại connector hỗ trợ — chuẩn VinFast VN */
export const CONNECTOR_TYPES = ['CCS', 'CCS2', 'CHAdeMO', 'Type2', 'GB/T', 'Other'] as const;
export type ConnectorType = typeof CONNECTOR_TYPES[number];

export class CreateBookingDto {
  @IsUUID()
  chargerId: string;

  @IsUUID()
  stationId: string;

  /**
   * Loại connector cần sạc — REQUIRED.
   * VinFast dùng CCS2 (DC) và Type2 (AC).
   * Xe Trung Quốc thường dùng GB/T.
   */
  @IsString()
  @IsIn(CONNECTOR_TYPES)
  connectorType: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  // depositAmount: đã bị XÓA — backend tự tính từ pricing_rules
}

export class CancelBookingDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class JoinQueueDto {
  @IsUUID()
  chargerId: string;

  @IsString()
  @IsIn(CONNECTOR_TYPES)
  connectorType: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  urgencyScore?: number; // 0–10; from vehicle SoC
}

export class AvailabilityQueryDto {
  @IsUUID()
  chargerId: string;

  /**
   * Ngày cần xem lịch — format: YYYY-MM-DD
   */
  @IsDateString()
  date: string;
}

export class SuggestChargerDto {
  @IsString()
  @IsIn(CONNECTOR_TYPES)
  connectorType: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  startTime?: string;

  @IsOptional()
  endTime?: string;
}
