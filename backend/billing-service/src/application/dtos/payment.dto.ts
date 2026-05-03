import { IsUUID, IsNumber, IsString, IsOptional, IsIP, IsIn, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsUUID()
  bookingId: string;

  @IsNumber()
  @Min(1000) // Minimum 1000 VND
  amount: number;

  @IsString()
  @IsOptional()
  ipAddr?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;
}

export class WalletTopupDto {
  @IsNumber()
  @Min(10000) // Minimum topup 10,000 VND
  amount: number;

  @IsString()
  @IsOptional()
  ipAddr?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;
}

export class WalletPayDto {
  @IsUUID()
  bookingId: string;

  @IsNumber()
  @Min(1000)
  amount: number;
}

export class GetTransactionHistoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number = 0;
}
