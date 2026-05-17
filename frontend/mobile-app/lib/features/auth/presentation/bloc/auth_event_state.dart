import 'package:equatable/equatable.dart';
import '../../domain/entities/user_entity.dart';

/// Base auth bloc event triggers
abstract class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;
  const AuthLoginRequested({required this.email, required this.password});
  @override
  List<Object?> get props => [email, password];
}

class AuthRegisterRequested extends AuthEvent {
  final String email;
  final String password;
  final String fullName;
  final String? phone;
  final DateTime dateOfBirth;

  const AuthRegisterRequested({
    required this.email,
    required this.password,
    required this.fullName,
    this.phone,
    required this.dateOfBirth,
  });

  @override
  List<Object?> get props => [email, password, fullName, phone, dateOfBirth];
}

class AuthMfaVerifyRequested extends AuthEvent {
  final String otpCode;
  const AuthMfaVerifyRequested({required this.otpCode});
  @override
  List<Object?> get props => [otpCode];
}

class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

class AuthTokensLoaded extends AuthEvent {
  final UserEntity user;
  final bool hasArrears;
  const AuthTokensLoaded({required this.user, required this.hasArrears});
  @override
  List<Object?> get props => [user, hasArrears];
}

class AuthVerifyEmailCodeRequested extends AuthEvent {
  final String code;
  const AuthVerifyEmailCodeRequested({required this.code});
  @override
  List<Object?> get props => [code];
}

class AuthVerifyMagicLinkRequested extends AuthEvent {
  final String token;
  const AuthVerifyMagicLinkRequested({required this.token});
  @override
  List<Object?> get props => [token];
}

class AuthResendVerificationRequested extends AuthEvent {
  final String email;
  const AuthResendVerificationRequested({required this.email});
  @override
  List<Object?> get props => [email];
}

/// Base auth bloc states
abstract class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

/// Initial authentication loading state
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// General async processing state
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Authenticated session state storing identity models and arrears flags
class AuthAuthenticated extends AuthState {
  final UserEntity user;
  final bool hasArrears;
  const AuthAuthenticated({required this.user, required this.hasArrears});
  @override
  List<Object?> get props => [user, hasArrears];
}

/// Anonymous state representing logged out profiles
class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Guard state indicating registration completed but verification is required
class AuthEmailVerificationRequired extends AuthState {
  final String email;
  const AuthEmailVerificationRequired({required this.email});
  @override
  List<Object?> get props => [email];
}

/// Verified state signifying email registration complete
class AuthEmailVerified extends AuthState {
  const AuthEmailVerified();
}

/// Guard state prompting for 6-digit MFA confirmation
class AuthMfaRequired extends AuthState {
  final String email;
  const AuthMfaRequired({required this.email});
  @override
  List<Object?> get props => [email];
}

/// Faulted auth state containing the mapped failure
class AuthError extends AuthState {
  final String message;
  final DateTime? lockedUntil;
  const AuthError({required this.message, this.lockedUntil});
  @override
  List<Object?> get props => [message, lockedUntil];
}
