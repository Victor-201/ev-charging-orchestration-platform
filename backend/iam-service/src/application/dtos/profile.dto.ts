import {
  IsString, IsOptional, IsUrl, MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL không hợp lệ' })
  @MaxLength(500)
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim() ?? null)
  address?: string | null;
}
