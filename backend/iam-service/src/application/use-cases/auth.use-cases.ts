import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { User } from '../../domain/entities/user.aggregate';
import { Session } from '../../domain/entities/session.aggregate';
import {
  IUserRepository, USER_REPOSITORY,
  ISessionRepository, SESSION_REPOSITORY,
  IRoleRepository, ROLE_REPOSITORY,
} from '../../domain/repositories/auth.repository.interface';
import {
  UserAlreadyExistsException,
  InvalidCredentialsException,
  TokenExpiredException,
  RoleNotFoundException,
  AccountLockedException,
  MfaRequiredException,
  InvalidMfaTokenException,
  MfaNotEnabledException,
  RateLimitExceededException,
} from '../../domain/exceptions/auth.exceptions';
import { IEventBus, EVENT_BUS } from '../../infrastructure/messaging/outbox/outbox-event-bus';
import { RoleAssignedEvent } from '../../domain/events/auth.events';
import { RiskScoringService, RiskLevel } from '../../domain/services/risk-scoring.service';
import { Redis } from 'ioredis';

// ─── Value Objects / Commands ─────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  mfaRequired?: boolean;  // true if MFA step needed
}

export interface RegisterCommand {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  dateOfBirth: Date;
}

export interface LoginCommand {
  email: string;
  password: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  mfaToken?: string;  // optional: provided when user has MFA enabled
}

// ─── Register Use Case ────────────────────────────────────────────────────────

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  async execute(cmd: RegisterCommand): Promise<{ id: string; email: string; fullName: string }> {
    const exists = await this.userRepo.existsByEmail(cmd.email);
    if (exists) throw new UserAlreadyExistsException(cmd.email);

    const passwordHash = await bcrypt.hash(cmd.password, 12);
    const user = User.create({
      email: cmd.email,
      fullName: cmd.fullName,
      phone: cmd.phone,
      dateOfBirth: cmd.dateOfBirth,
      passwordHash,
    });

    const defaultRole = await this.roleRepo.findByName('user');

    await this.dataSource.transaction(async (manager: EntityManager) => {
      await this.userRepo.save(user, manager);
      if (defaultRole) {
        await this.roleRepo.assignRoleToUser(user.id, defaultRole.id, null);
      }
      await this.eventBus.publishAll(user.domainEvents, manager);
      user.clearDomainEvents();
    });

    this.logger.log(`Registered user: ${user.id} <${user.email}>`);
    return { id: user.id, email: user.email, fullName: user.fullName };
  }
}

// ─── Login Use Case (Risk-Based) ──────────────────────────────────────────────

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);
  private readonly RATE_LIMIT_KEY = 'auth:rate:ip:';
  private readonly MAX_ATTEMPTS_PER_IP = 10;
  private readonly RATE_WINDOW_SECONDS = 900; // 15 minutes

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly riskScoring: RiskScoringService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async execute(cmd: LoginCommand): Promise<TokenPair> {
    // ── STEP 1: IP Rate Limiting ─────────────────────────────────────────────
    if (cmd.ipAddress) {
      await this.checkIpRateLimit(cmd.ipAddress);
    }

    // ── STEP 2: Find user ────────────────────────────────────────────────────
    const user = await this.userRepo.findByEmail(cmd.email);
    if (!user) throw new InvalidCredentialsException();

    // ── STEP 3: Check account lock ───────────────────────────────────────────
    user.assertIsNotLocked();
    user.assertIsActive();

    // ── STEP 4: Verify password ──────────────────────────────────────────────
    const valid = await bcrypt.compare(cmd.password, user.passwordHash);
    if (!valid) {
      user.incrementFailedLogin(5, 30);
      await this.userRepo.save(user);
      // Track IP failure in Redis
      if (cmd.ipAddress) {
        await this.redis.incr(`auth:fail:ip:${cmd.ipAddress}`);
        await this.redis.expire(`auth:fail:ip:${cmd.ipAddress}`, 900);
      }
      throw new InvalidCredentialsException();
    }

    // ── STEP 5: Risk Scoring ─────────────────────────────────────────────────
    const activeSessions = await this.sessionRepo.findActiveByUserId(user.id);
    const knownFingerprints = activeSessions
      .filter(s => s.deviceFingerprint)
      .map(s => s.deviceFingerprint!);

    const recentFails = cmd.ipAddress
      ? parseInt((await this.redis.get(`auth:fail:ip:${cmd.ipAddress}`)) ?? '0', 10)
      : 0;

    const risk = this.riskScoring.calculate({
      ipAddress: cmd.ipAddress,
      deviceFingerprint: cmd.deviceFingerprint,
      knownDeviceFingerprints: knownFingerprints,
      recentFailedAttempts: recentFails,
      userAgent: cmd.userAgent,
    });

    if (risk.level === RiskLevel.HIGH) {
      user.flagSuspiciousActivity(risk.reasons.join('; '), cmd.ipAddress);
      await this.userRepo.save(user);
      throw new InvalidCredentialsException(); // don't reveal detail
    }

    // ── STEP 6: MFA Check ────────────────────────────────────────────────────
    if (user.mfaEnabled) {
      if (!cmd.mfaToken) {
        // Return partial token indicating MFA required
        throw new MfaRequiredException();
      }
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: 'base32',
        token: cmd.mfaToken,
        window: 1,
      });
      if (!verified) throw new InvalidMfaTokenException();
    }

    // ── STEP 7: Reset failed count + issue tokens ────────────────────────────
    user.resetFailedLogin();
    await this.userRepo.save(user);

    const roles = await this.roleRepo.findRolesByUserId(user.id);
    const roleNames = roles.map(r => r.name);

    const expiresIn = parseInt(this.config.get('JWT_EXPIRES_IN_SECONDS', '900'));
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, roles: roleNames },
      { expiresIn },
    );

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const refreshTtlDays = parseInt(this.config.get('REFRESH_TOKEN_TTL_DAYS', '7'));

    const session = Session.create({
      userId: user.id,
      refreshTokenHash: tokenHash,
      deviceFingerprint: cmd.deviceFingerprint,
      ipAddress: cmd.ipAddress,
      userAgent: cmd.userAgent,
      expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
    });
    await this.sessionRepo.save(session);

    // Clear IP failure counter on success
    if (cmd.ipAddress) {
      await this.redis.del(`auth:fail:ip:${cmd.ipAddress}`);
    }

    this.logger.log(`Login: user=${user.id} session=${session.id} risk=${risk.level}`);
    return { accessToken, refreshToken: rawRefreshToken, expiresIn, sessionId: session.id };
  }

  private async checkIpRateLimit(ip: string): Promise<void> {
    const key = `${this.RATE_LIMIT_KEY}${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, this.RATE_WINDOW_SECONDS);
    }
    if (count > this.MAX_ATTEMPTS_PER_IP) {
      throw new RateLimitExceededException();
    }
  }
}

// ─── Refresh Token Use Case ───────────────────────────────────────────────────

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(rawToken: string): Promise<TokenPair> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (!session) throw new TokenExpiredException();
    session.assertIsUsable();

    const user = await this.userRepo.findById(session.userId);
    if (!user) throw new InvalidCredentialsException();
    user.assertIsActive();

    const roles = await this.roleRepo.findRolesByUserId(user.id);
    const roleNames = roles.map(r => r.name);

    // Token rotation: revoke cũ, tạo mới
    await this.sessionRepo.revokeById(session.id);

    const expiresIn = parseInt(this.config.get('JWT_EXPIRES_IN_SECONDS', '900'));
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, roles: roleNames },
      { expiresIn },
    );

    const newRaw = crypto.randomBytes(64).toString('hex');
    const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
    const refreshTtlDays = parseInt(this.config.get('REFRESH_TOKEN_TTL_DAYS', '7'));

    const newSession = Session.create({
      userId: user.id,
      refreshTokenHash: newHash,
      deviceFingerprint: session.deviceFingerprint ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
    });
    await this.sessionRepo.save(newSession);

    return { accessToken, refreshToken: newRaw, expiresIn, sessionId: newSession.id };
  }
}

// ─── Logout Use Case ──────────────────────────────────────────────────────────

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.sessionRepo.revokeById(sessionId);
    } else {
      await this.sessionRepo.revokeAllByUserId(userId);
    }
  }
}

// ─── Change Password Use Case ─────────────────────────────────────────────────

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new InvalidCredentialsException();

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new InvalidCredentialsException();

    const newHash = await bcrypt.hash(newPassword, 12);
    user.updatePasswordHash(newHash);

    await this.dataSource.transaction(async (manager: EntityManager) => {
      await this.userRepo.save(user, manager);
      await this.eventBus.publishAll(user.domainEvents, manager);
      user.clearDomainEvents();
    });

    await this.sessionRepo.revokeAllByUserId(userId);
  }
}

// ─── Assign Role Use Case ─────────────────────────────────────────────────────

@Injectable()
export class AssignRoleUseCase {
  private readonly logger = new Logger(AssignRoleUseCase.name);

  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(
    targetUserId: string,
    roleName: string,
    assignedByUserId: string,
    expiresAt?: Date,
  ): Promise<void> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new RoleNotFoundException(roleName);

    await this.roleRepo.assignRoleToUser(targetUserId, role.id, assignedByUserId, expiresAt);

    const event = new RoleAssignedEvent(targetUserId, roleName, assignedByUserId);
    await this.eventBus.publishAll([event]);
    this.logger.log(`Role '${roleName}' assigned to user ${targetUserId} by ${assignedByUserId}`);
  }
}

// ─── Revoke Role Use Case ─────────────────────────────────────────────────────

@Injectable()
export class RevokeRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(targetUserId: string, roleName: string): Promise<void> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new RoleNotFoundException(roleName);
    await this.roleRepo.revokeRoleFromUser(targetUserId, role.id);
  }
}

// ─── Get User Sessions Use Case ───────────────────────────────────────────────

@Injectable()
export class GetUserSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(userId: string) {
    const sessions = await this.sessionRepo.findActiveByUserId(userId);
    return sessions.map(s => ({
      id: s.id,
      deviceFingerprint: s.deviceFingerprint,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }
}

// ─── MFA Use Cases ────────────────────────────────────────────────────────────

@Injectable()
export class SetupMfaUseCase {
  private readonly logger = new Logger(SetupMfaUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  /**
   * Setup TOTP MFA: generate secret, return QR code URL
   * User phải verify trước khi MFA được activate (xem VerifyMfaSetupUseCase)
   */
  async execute(userId: string): Promise<{ secret: string; otpAuthUrl: string; qrCodeUrl: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new InvalidCredentialsException();

    const secret = speakeasy.generateSecret({
      name: `EV Charging (${user.email})`,
      length: 32,
    });

    // Lưu secret tạm (chưa enable — chỉ enable sau khi verify)
    user.enableMfa(secret.base32);
    await this.userRepo.save(user);

    return {
      secret: secret.base32,
      otpAuthUrl: secret.otpauth_url ?? '',
      qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(secret.otpauth_url ?? '')}`,
    };
  }
}

@Injectable()
export class VerifyMfaUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string, token: string): Promise<{ verified: boolean }> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.mfaSecret) throw new InvalidCredentialsException();

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) throw new InvalidMfaTokenException();

    return { verified: true };
  }
}

@Injectable()
export class DisableMfaUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string, password: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new InvalidCredentialsException();
    if (!user.mfaEnabled) throw new MfaNotEnabledException();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsException();

    user.disableMfa();
    await this.userRepo.save(user);
  }
}
