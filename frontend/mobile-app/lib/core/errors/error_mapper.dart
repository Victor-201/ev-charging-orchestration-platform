import 'package:dio/dio.dart';
import 'failures.dart';

/// Ánh xạ DioException → Failure tương ứng
class ErrorMapper {
  static Failure fromDioException(DioException e) {
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.unknown) {
      return const NetworkFailure();
    }

    final statusCode = e.response?.statusCode;
    final data = e.response?.data;
    final message = _extractMessage(data);

    switch (statusCode) {
      case 400:
        final fieldErrors = _extractFieldErrors(data);
        return ValidationFailure(
          message ?? 'Dữ liệu đầu vào không hợp lệ',
          fieldErrors: fieldErrors,
        );
      case 401:
        return const UnauthorizedFailure();
      case 403:
        if (data is Map<String, dynamic> && data['code'] == 'EMAIL_NOT_VERIFIED') {
          return EmailNotVerifiedFailure(message ?? 'Vui lòng xác thực email của bạn');
        }
        return PermissionFailure(message ?? 'Không có quyền truy cập');
      case 404:
        return NotFoundFailure(message ?? 'Không tìm thấy dữ liệu');
      case 409:
        return ConflictFailure(message ?? 'Dữ liệu đã tồn tại');
      case 422:
        if (message?.toLowerCase().contains('wallet') == true &&
            message?.toLowerCase().contains('closed') == true) {
          return const WalletClosedFailure();
        }
        return BusinessFailure(message ?? 'Lỗi nghiệp vụ');
      case 423:
        final lockedUntil = _extractLockedUntil(data);
        return AccountLockedFailure(
          message ?? 'Tài khoản bị khóa',
          lockedUntil: lockedUntil,
        );
      case 429:
        final retryAfter = _extractRetryAfter(e.response?.headers);
        return RateLimitFailure(
          message ?? 'Vượt giới hạn yêu cầu',
          retryAfterSeconds: retryAfter,
        );
      case 500:
      default:
        return ServerFailure(message ?? 'Lỗi máy chủ. Vui lòng thử lại sau.');
    }
  }

  static String? _extractMessage(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data['message']?.toString() ?? data['error']?.toString();
    }
    return null;
  }

  static Map<String, String>? _extractFieldErrors(dynamic data) {
    if (data is Map<String, dynamic> && data['errors'] is Map) {
      return (data['errors'] as Map<String, dynamic>)
          .map((k, v) => MapEntry(k, v.toString()));
    }
    return null;
  }

  static DateTime? _extractLockedUntil(dynamic data) {
    if (data is Map<String, dynamic> && data['lockedUntil'] != null) {
      return DateTime.tryParse(data['lockedUntil'].toString());
    }
    return null;
  }

  static int? _extractRetryAfter(Headers? headers) {
    final value = headers?.value('Retry-After');
    return value != null ? int.tryParse(value) : null;
  }
}
