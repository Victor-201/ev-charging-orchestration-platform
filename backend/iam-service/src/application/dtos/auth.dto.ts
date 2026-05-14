import {
  IsEmail, IsString, MinLength, IsOptional, IsEnum,
  IsDateString, Matches, IsUUID, Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Register

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @IsDateString({}, { message: 'Birth date must follow YYYY-MM-DD format' })
  dateOfBirth: string;
}

// Login

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  mfaToken?: string;
}

// Refresh Token

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

// Change Password

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}

// Assign Role

export class AssignRoleDto {
  @IsUUID()
  userId: string;

  @IsString()
  roleName: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

// Revoke Role

export class RevokeRoleDto {
  @IsUUID()
  userId: string;

  @IsString()
  roleName: string;
}

// MFA

export class VerifyMfaDto {
  @IsString()
  @Length(6, 6, { message: 'MFA token must be exactly 6 digits' })
  token: string;
}

export class DisableMfaDto {
  @IsString()
  password: string;
}

// Email Verification

export class VerifyEmailDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  code?: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}
