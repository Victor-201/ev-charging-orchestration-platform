import {
  IsString, IsOptional, IsNumber, Min, Max, IsEnum,
  IsInt, Length, Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum ConnectorType {
  CCS = 'CCS',
  CHAdeMO = 'CHAdeMO',
  TYPE2 = 'Type2',
  GBT = 'GB/T',
  OTHER = 'Other',
}

export class AddVehicleDto {
  @IsString()
  @Length(2, 50)
  brand: string;

  @IsString()
  @Length(1, 50)
  modelName: string;

  @IsInt()
  @Min(1990)
  @Max(2100)
  year: number;

  @IsString()
  @Length(3, 20)
  @Matches(/^[A-Z0-9\-\.]+$/i, { message: 'Biển số không hợp lệ' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  plateNumber: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  color?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  batteryCapacityKwh?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  usableCapacityKwh?: number;

  @IsOptional()
  @IsEnum(ConnectorType, { message: 'Loại connector không hợp lệ' })
  defaultChargePort?: ConnectorType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  maxAcPowerKw?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  maxDcPowerKw?: number;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @Length(0, 30)
  color?: string | null;
}

/**
 * AutoChargeSetupDto
 *
 * User cấu hình "Cắm là Sạc" cho xe của mình.
 * Cung cấp MAC address (từ nhãn xe / app VinFast) để binding.
 */
export class AutoChargeSetupDto {
  /**
   * MAC address của cáp sạc xe (ví dụ: AA:BB:CC:DD:EE:FF)
   * Được in trên tem xe hoặc lấy từ app VinFast.
   */
  @IsOptional()
  @IsString()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, {
    message: 'MAC address không hợp lệ (chuẩn: AA:BB:CC:DD:EE:FF)',
  })
  macAddress?: string | null;

  /**
   * Số VIN 17 ký tự (Vehicle Identification Number)
   * Dùng cho ISO 15118 Plug & Charge (tầng cao hơn).
   */
  @IsOptional()
  @IsString()
  @Length(17, 17, { message: 'VIN phải đúng 17 ký tự' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, { message: 'VIN không hợp lệ (loại trừ I, O, Q)' })
  vinNumber?: string | null;

  /** Bật / Tắt tính năng AutoCharge (Cắm là Sạc) */
  @IsOptional()
  autochargeEnabled?: boolean;
}
