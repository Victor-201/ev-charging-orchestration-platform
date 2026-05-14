import {
  IsString, IsNotEmpty, IsUUID, IsNumber, IsOptional,
  Min, Max, MaxLength, IsEnum, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorType, ChargerStatus } from '../../domain/entities/charger.aggregate';

// Connector Spec (nested within AddChargerDto)

export class ConnectorSpecDto {
  @IsEnum(ConnectorType)
  connectorType: ConnectorType;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  maxPowerKw?: number;
}

// Add Charger

export class AddChargerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string;

  @IsNumber()
  @Min(0.1)
  @Max(1000)
  @Type(() => Number)
  maxPowerKw: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConnectorSpecDto)
  connectors?: ConnectorSpecDto[];
}

// Update Charger Status

export class UpdateChargerStatusDto {
  @IsEnum(ChargerStatus)
  status: ChargerStatus;
}
