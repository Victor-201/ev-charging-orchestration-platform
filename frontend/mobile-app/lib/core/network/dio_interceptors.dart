import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/storage_keys.dart';

/// JWT Authentication Interceptor — injects Bearer token, handles 401 refresh
/// Inherits from QueuedInterceptor to queue all concurrent 401 requests
class DioAuthInterceptor extends QueuedInterceptor {
  final FlutterSecureStorage _secureStorage;
  final Dio _dio;
  final Future<void> Function()? onLogout;

  DioAuthInterceptor({
    required FlutterSecureStorage secureStorage,
    required Dio dio,
    this.onLogout,
  })  : _secureStorage = secureStorage,
        _dio = dio;

  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    final token =
        await _secureStorage.read(key: StorageKeys.accessToken);
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(
      DioException err, ErrorInterceptorHandler handler) async {
    // Only handle 401 and not the refresh endpoint itself
    if (err.response?.statusCode == 401 &&
        !err.requestOptions.path.contains('/auth/refresh')) {
      try {
        final newTokens = await _refresh();
        if (newTokens != null) {
          await _secureStorage.write(
            key: StorageKeys.accessToken,
            value: newTokens,
          );
          // Retry original request with new token
          err.requestOptions.headers['Authorization'] = 'Bearer $newTokens';
          final retry = await _dio.fetch(err.requestOptions);
          return handler.resolve(retry);
        }
      } catch (_) {
        // Refresh failed → log out
        await _clearTokens();
        onLogout?.call();
      }
    }
    handler.next(err);
  }

  Future<String?> _refresh() async {
    final refreshToken =
        await _secureStorage.read(key: StorageKeys.refreshToken);
    if (refreshToken == null) return null;

    final response = await _dio.post(
      '/auth/refresh',
      data: {'refreshToken': refreshToken},
    );

    final accessToken = response.data['data']?['accessToken'] as String?;
    final newRefresh = response.data['data']?['refreshToken'] as String?;

    if (newRefresh != null) {
      await _secureStorage.write(
        key: StorageKeys.refreshToken,
        value: newRefresh,
      );
    }
    return accessToken;
  }

  Future<void> _clearTokens() async {
    await _secureStorage.delete(key: StorageKeys.accessToken);
    await _secureStorage.delete(key: StorageKeys.refreshToken);
  }
}

/// Logging Interceptor — active only in dev flavor
class DioLoggingInterceptor extends Interceptor {
  final bool enabled;

  DioLoggingInterceptor({required this.enabled});

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (enabled) {
      // ignore: avoid_print
      print(
          '[DIO] → ${options.method} ${options.baseUrl}${options.path}');
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (enabled) {
      // ignore: avoid_print
      print('[DIO] ← ${response.statusCode} ${response.requestOptions.path}');
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (enabled) {
      // ignore: avoid_print
      print(
          '[DIO] ✗ ${err.response?.statusCode} ${err.requestOptions.path}: ${err.message}');
      if (err.response?.data != null) {
        // ignore: avoid_print
        print('[DIO] Error Body: ${err.response?.data}');
      }
    }
    handler.next(err);
  }
}
