import 'package:equatable/equatable.dart';

/// Base class for all business failures
abstract class Failure extends Equatable {
  final String message;
  const Failure(this.message);

  @override
  List<Object?> get props => [message];
}

/// 400 — Invalid input data (inline field errors)
class ValidationFailure extends Failure {
  final Map<String, String>? fieldErrors;
  const ValidationFailure(super.message, {this.fieldErrors});

  @override
  List<Object?> get props => [message, fieldErrors];
}

/// 401 — Unauthorized (interceptor handles auto-refresh)
class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure([super.message = 'Session expired']);
}

/// 403 - Email not verified
class EmailNotVerifiedFailure extends Failure {
  const EmailNotVerifiedFailure([super.message = 'Please verify your email address']);
}

/// 403 — Forbidden access
class PermissionFailure extends Failure {
  const PermissionFailure([super.message = 'Access denied']);
}

/// 404 — Data not found
class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'Data not found']);
}

/// 409 — Data conflict (e.g., email already exists)
class ConflictFailure extends Failure {
  const ConflictFailure(super.message);
}

/// 422 — Business logic failure (insufficient balance, wallet closed, arrears)
class BusinessFailure extends Failure {
  const BusinessFailure(super.message);
}

/// 423 — Account locked (e.g., after multiple failed logins)
class AccountLockedFailure extends Failure {
  final DateTime? lockedUntil;
  const AccountLockedFailure(super.message, {this.lockedUntil});

  @override
  List<Object?> get props => [message, lockedUntil];
}

/// 429 — Rate limit exceeded
class RateLimitFailure extends Failure {
  final int? retryAfterSeconds;
  const RateLimitFailure(super.message, {this.retryAfterSeconds});

  @override
  List<Object?> get props => [message, retryAfterSeconds];
}

/// 500 — Server failure
class ServerFailure extends Failure {
  const ServerFailure([super.message = 'Server error. Please try again later.']);
}

/// Network connectivity error
class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No network connection']);
}

/// Permanent wallet closure error
class WalletClosedFailure extends Failure {
  const WalletClosedFailure(
      [super.message = 'Wallet has been permanently closed']);
}

/// Unknown error
class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'An unknown error occurred']);
}
