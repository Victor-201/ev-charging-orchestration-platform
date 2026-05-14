import 'package:equatable/equatable.dart';
import '../../domain/entities/user_entity.dart';

/// Sự kiện AuthBloc
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

/// Trạng thái AuthBloc
abstract class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

/// Trạng thái khởi tạo
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// Đang xử lý
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Đã xác thực — lưu trữ thông tin người dùng và cờ nợ tồn đọng
class AuthAuthenticated extends AuthState {
  final UserEntity user;
  final bool hasArrears;
  const AuthAuthenticated({required this.user, required this.hasArrears});
  @override
  List<Object?> get props => [user, hasArrears];
}

/// Chưa xác thực
class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Yêu cầu xác thực email — sau khi đăng ký
class AuthEmailVerificationRequired extends AuthState {
  final String email;
  const AuthEmailVerificationRequired({required this.email});
  @override
  List<Object?> get props => [email];
}

/// Email xác thực thành công
class AuthEmailVerified extends AuthState {
  const AuthEmailVerified();
}

/// Yêu cầu xác thực MFA
class AuthMfaRequired extends AuthState {
  final String email;
  const AuthMfaRequired({required this.email});
  @override
  List<Object?> get props => [email];
}

/// Lỗi xác thực
class AuthError extends AuthState {
  final String message;
  final DateTime? lockedUntil;
  const AuthError({required this.message, this.lockedUntil});
  @override
  List<Object?> get props => [message, lockedUntil];
}
