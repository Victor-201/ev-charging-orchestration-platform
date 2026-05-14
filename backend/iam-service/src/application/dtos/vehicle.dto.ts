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
  @Matches(/^[A-Z0-9\-\.]+$/i, { message: 'Invalid plate number format' })
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
  @IsEnum(ConnectorType, { message: 'Invalid connector type' })
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
 * Sets up "Plug & Charge" (AutoCharge) for the vehicle.
 * Requires MAC address (from vehicle tag or VinFast app) for binding.
 */
export class AutoChargeSetupDto {
  /**
   * Vehicle charging cable MAC address (e.g., AA:BB:CC:DD:EE:FF).
   * Printed on the vehicle tag or retrieved from the VinFast app.
   */
  @IsOptional()
  @IsString()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, {
    message: 'Invalid MAC address (format: AA:BB:CC:DD:EE:FF)',
  })
  macAddress?: string | null;

  /**
   * 17-character VIN (Vehicle Identification Number).
   * Used for ISO 15118 Plug & Charge (higher level protocols).
   */
  @IsOptional()
  @IsString()
  @Length(17, 17, { message: 'VIN must be exactly 17 characters' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, { message: 'Invalid VIN (excludes I, O, Q)' })
  vinNumber?: string | null;

  /** Enable/Disable AutoCharge (Plug & Charge) */
  @IsOptional()
  autochargeEnabled?: boolean;
}
