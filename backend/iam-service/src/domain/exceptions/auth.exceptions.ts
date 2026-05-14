export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DomainException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`User with email '${email}' already exists`, 'USER_ALREADY_EXISTS');
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

export class UserInactiveException extends DomainException {
  constructor() {
    super('User account is inactive or suspended', 'USER_INACTIVE');
  }
}

export class TokenExpiredException extends DomainException {
  constructor() {
    super('Token has expired or been revoked', 'TOKEN_EXPIRED');
  }
}

export class InvalidVerificationCodeException extends DomainException {
  constructor() {
    super('Invalid verification code', 'INVALID_VERIFICATION_CODE');
  }
}

export class SessionNotFoundException extends DomainException {
  constructor() {
    super('Session not found', 'SESSION_NOT_FOUND');
  }
}

export class UnauthorizedRoleAssignmentException extends DomainException {
  constructor() {
    super('Insufficient permissions to assign this role', 'UNAUTHORIZED_ROLE_ASSIGNMENT');
  }
}

export class RoleNotFoundException extends DomainException {
  constructor(name: string) {
    super(`Role '${name}' not found`, 'ROLE_NOT_FOUND');
  }
}

export class AgeRequirementException extends DomainException {
  constructor() {
    super('User must be at least 18 years old', 'AGE_REQUIREMENT_NOT_MET');
  }
}

export class AccountLockedException extends DomainException {
  constructor(public readonly lockedUntil: Date) {
    super(
      `Account is locked until ${lockedUntil.toISOString()}`,
      'ACCOUNT_LOCKED',
    );
  }
}

export class MfaRequiredException extends DomainException {
  constructor() {
    super('MFA verification required', 'MFA_REQUIRED');
  }
}

export class InvalidMfaTokenException extends DomainException {
  constructor() {
    super('Invalid MFA token', 'INVALID_MFA_TOKEN');
  }
}

export class MfaNotEnabledException extends DomainException {
  constructor() {
    super('MFA is not enabled for this account', 'MFA_NOT_ENABLED');
  }
}

export class RateLimitExceededException extends DomainException {
  constructor() {
    super('Too many login attempts. Please try again later.', 'RATE_LIMIT_EXCEEDED');
  }
}

export class EmailNotVerifiedException extends DomainException {
  constructor() {
    super('Email address is not verified', 'EMAIL_NOT_VERIFIED');
  }
}
