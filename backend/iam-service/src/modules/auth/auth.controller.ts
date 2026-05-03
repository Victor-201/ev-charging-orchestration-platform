import {
  Controller, Post, Get, Delete, Patch, Body, Req, HttpCode, HttpStatus,
  UseGuards, UnauthorizedException, BadRequestException, ForbiddenException,
  HttpException, Param, ParseUUIDPipe, Logger,
} from '@nestjs/common';
import { Request } from 'express';
import {
  RegisterUseCase, LoginUseCase, RefreshTokenUseCase, LogoutUseCase,
  ChangePasswordUseCase, AssignRoleUseCase, RevokeRoleUseCase,
  GetUserSessionsUseCase, SetupMfaUseCase, VerifyMfaUseCase, DisableMfaUseCase,
  RegisterCommand, LoginCommand,
} from '../../application/use-cases/auth.use-cases';
import {
  RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto,
  AssignRoleDto, RevokeRoleDto, VerifyMfaDto, DisableMfaDto,
} from '../../application/dtos/auth.dto';
import {
  UserAlreadyExistsException, InvalidCredentialsException,
  UserInactiveException, TokenExpiredException, RoleNotFoundException,
  DomainException, AccountLockedException, MfaRequiredException,
  InvalidMfaTokenException, MfaNotEnabledException, RateLimitExceededException,
} from '../../domain/exceptions/auth.exceptions';
import { JwtAuthGuard, AuthenticatedUser } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly registerUC: RegisterUseCase,
    private readonly loginUC: LoginUseCase,
    private readonly refreshUC: RefreshTokenUseCase,
    private readonly logoutUC: LogoutUseCase,
    private readonly changePasswordUC: ChangePasswordUseCase,
    private readonly assignRoleUC: AssignRoleUseCase,
    private readonly revokeRoleUC: RevokeRoleUseCase,
    private readonly getSessionsUC: GetUserSessionsUseCase,
    private readonly setupMfaUC: SetupMfaUseCase,
    private readonly verifyMfaUC: VerifyMfaUseCase,
    private readonly disableMfaUC: DisableMfaUseCase,
  ) {}

  // â”€â”€â”€ POST /auth/register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const cmd: RegisterCommand = {
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      phone: dto.phone,
      dateOfBirth: new Date(dto.dateOfBirth),
    };
    try {
      return await this.registerUC.execute(cmd);
    } catch (e) {
      if (e instanceof UserAlreadyExistsException) throw new BadRequestException(e.message);
      if (e instanceof DomainException) throw new BadRequestException(e.message);
      throw e;
    }
  }

  // â”€â”€â”€ POST /auth/login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const cmd: LoginCommand = {
      email: dto.email,
      password: dto.password,
      mfaToken: dto.mfaToken,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: req.headers['x-device-fingerprint'] as string,
    };
    try {
      return await this.loginUC.execute(cmd);
    } catch (e) {
      if (e instanceof RateLimitExceededException) throw new HttpException(e.message, HttpStatus.TOO_MANY_REQUESTS);
      if (e instanceof AccountLockedException) throw new ForbiddenException(e.message);
      if (e instanceof MfaRequiredException) throw new ForbiddenException({ code: 'MFA_REQUIRED', message: e.message });
      if (e instanceof InvalidMfaTokenException) throw new UnauthorizedException(e.message);
      if (e instanceof InvalidCredentialsException) throw new UnauthorizedException(e.message);
      if (e instanceof UserInactiveException) throw new ForbiddenException(e.message);
      throw e;
    }
  }

  // â”€â”€â”€ POST /auth/refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      return await this.refreshUC.execute(dto.refreshToken);
    } catch (e) {
      if (e instanceof TokenExpiredException) throw new UnauthorizedException(e.message);
      if (e instanceof InvalidCredentialsException) throw new UnauthorizedException(e.message);
      throw e;
    }
  }

  // â”€â”€â”€ POST /auth/logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body('sessionId') sessionId?: string,
  ) {
    await this.logoutUC.execute(user.id, sessionId);
  }

  // â”€â”€â”€ GET /auth/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { id: user.id, email: user.email, roles: user.roles };
  }

  // â”€â”€â”€ PATCH /auth/change-password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    try {
      await this.changePasswordUC.execute(user.id, dto.currentPassword, dto.newPassword);
    } catch (e) {
      if (e instanceof InvalidCredentialsException) throw new BadRequestException(e.message);
      throw e;
    }
  }

  // â”€â”€â”€ GET /auth/sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.getSessionsUC.execute(user.id);
  }

  // â”€â”€â”€ DELETE /auth/sessions/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    await this.logoutUC.execute(user.id, sessionId);
  }

  // â”€â”€â”€ DELETE /auth/sessions (Revoke all) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Delete('sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(@CurrentUser() user: AuthenticatedUser) {
    await this.logoutUC.execute(user.id);
  }

  // â”€â”€â”€ POST /auth/roles/assign (Admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('roles/assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async assignRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AssignRoleDto,
  ) {
    try {
      await this.assignRoleUC.execute(
        dto.userId,
        dto.roleName,
        admin.id,
        dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      );
    } catch (e) {
      if (e instanceof RoleNotFoundException) throw new BadRequestException(e.message);
      throw e;
    }
  }

  // â”€â”€â”€ POST /auth/roles/revoke (Admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('roles/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async revokeRole(@Body() dto: RevokeRoleDto) {
    try {
      await this.revokeRoleUC.execute(dto.userId, dto.roleName);
    } catch (e) {
      if (e instanceof RoleNotFoundException) throw new BadRequestException(e.message);
      throw e;
    }
  }

  // â”€â”€â”€ MFA Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.setupMfaUC.execute(user.id);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async verifyMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyMfaDto,
  ) {
    try {
      return await this.verifyMfaUC.execute(user.id, dto.token);
    } catch (e) {
      if (e instanceof InvalidMfaTokenException) throw new BadRequestException(e.message);
      throw e;
    }
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async disableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DisableMfaDto,
  ) {
    try {
      await this.disableMfaUC.execute(user.id, dto.password);
    } catch (e) {
      if (e instanceof InvalidCredentialsException) throw new BadRequestException(e.message);
      if (e instanceof MfaNotEnabledException) throw new BadRequestException(e.message);
      throw e;
    }
  }
}
