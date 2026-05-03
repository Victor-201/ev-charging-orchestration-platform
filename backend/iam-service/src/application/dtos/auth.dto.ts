import {
  IsEmail, IsString, MinLength, IsOptional, IsEnum,
  IsDateString, Matches, IsUUID, Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ─── Register ─────────────────────────────────────────────────────────────────

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Họ tên tối thiểu 2 ký tự' })
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @IsDateString({}, { message: 'Ngày sinh phải có định dạng YYYY-MM-DD' })
  dateOfBirth: string;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  mfaToken?: string;
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

// ─── Change Password ──────────────────────────────────────────────────────────

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới tối thiểu 8 ký tự' })
  newPassword: string;
}

// ─── Assign Role ──────────────────────────────────────────────────────────────

export class AssignRoleDto {
  @IsUUID()
  userId: string;

  @IsString()
  roleName: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

// ─── Revoke Role ──────────────────────────────────────────────────────────────

export class RevokeRoleDto {
  @IsUUID()
  userId: string;

  @IsString()
  roleName: string;
}

// ─── MFA ──────────────────────────────────────────────────────────────────────

export class VerifyMfaDto {
  @IsString()
  @Length(6, 6, { message: 'MFA token phải có đúng 6 chữ số' })
  token: string;
}

export class DisableMfaDto {
  @IsString()
  password: string;
}
