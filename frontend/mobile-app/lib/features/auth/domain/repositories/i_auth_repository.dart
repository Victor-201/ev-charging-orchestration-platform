import 'package:dartz/dartz.dart';
import '../../domain/entities/user_entity.dart';
import '../../../../core/errors/failures.dart';

/// Kết quả đăng nhập — thành công hoặc yêu cầu MFA
class LoginResult {
  final String? accessToken;
  final String? refreshToken;
  final bool mfaRequired;
  final UserEntity? user;

  const LoginResult({
    this.accessToken,
    this.refreshToken,
    required this.mfaRequired,
    this.user,
  });
}

/// Giao diện kho lưu trữ xác thực
abstract class IAuthRepository {
  Future<Either<Failure, LoginResult>> login({
    required String email,
    required String password,
  });

  Future<Either<Failure, LoginResult>> verifyMfa({
    required String otpCode,
  });

  Future<Either<Failure, UserEntity>> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
    required DateTime dateOfBirth,
  });

  Future<Either<Failure, String>> refreshToken();

  Future<Either<Failure, void>> logout();

  Future<Either<Failure, UserEntity>> getMe();

  Future<Either<Failure, LoginResult>> verifyEmail({String? token, String? code});

  Future<Either<Failure, void>> resendVerification({required String email});
}
