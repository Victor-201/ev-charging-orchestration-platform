import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStaffDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsOptional()
  position: string;

  @IsString()
  @IsOptional()
  shift: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  stationId?: string;
}

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CheckInDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsUUID()
  @IsOptional()
  stationId?: string;
}

export class CheckOutDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
