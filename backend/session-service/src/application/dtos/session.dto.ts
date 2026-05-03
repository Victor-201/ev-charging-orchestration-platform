import { IsString, IsOptional, IsNumber, IsUUID, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StartSessionDto {
  /** ID trụ sạc người dùng chọn trên màn hình kiosk. */
  @IsUUID()
  chargerId: string;

  /**
   * Luồng có đặt lịch trước:
   * bookingId lấy từ mã QR (app tạo khi booking, kiosk quét và gửi lên).
   * Nếu không có → walk-in.
   */
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  /**
   * Token xác minh QR (JWT ngắn hạn chứa bookingId + userId).
   * Bắt buộc khi có bookingId, hệ thống sẽ verify trước khi start session.
   */
  @IsOptional()
  @IsString()
  qrToken?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  startMeterWh?: number;

  // userId KHÔNG được phép gửi từ client — luôn lấy từ JWT (CurrentUser).
  // initiatedBy luôn là 'user' vì user tự thao tác tại kiosk.
}

export class StopSessionDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  endMeterWh: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RecordTelemetryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  powerKw?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  meterWh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  socPercent?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  temperatureC?: number;

  @IsOptional()
  @IsString()
  errorCode?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  voltage?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentA?: number;
}
