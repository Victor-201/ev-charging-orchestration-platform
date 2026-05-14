import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants/storage_keys.dart';

/// Dịch vụ lưu trữ bảo mật — AES-256 Android Keystore / iOS Keychain
class SecureStorageService {
  final FlutterSecureStorage _storage;

  const SecureStorageService(this._storage);

  // ── Token ─────────────────────────────────────────────────
  Future<void> saveAccessToken(String token) =>
      _storage.write(key: StorageKeys.accessToken, value: token);

  Future<String?> getAccessToken() =>
      _storage.read(key: StorageKeys.accessToken);

  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: StorageKeys.refreshToken, value: token);

  Future<String?> getRefreshToken() =>
      _storage.read(key: StorageKeys.refreshToken);

  Future<void> saveDeviceId(String id) =>
      _storage.write(key: StorageKeys.deviceId, value: id);

  Future<String?> getDeviceId() =>
      _storage.read(key: StorageKeys.deviceId);

  Future<void> saveFcmToken(String token) =>
      _storage.write(key: StorageKeys.fcmToken, value: token);

  Future<String?> getFcmToken() =>
      _storage.read(key: StorageKeys.fcmToken);

  /// Xóa tất cả token khi đăng xuất
  Future<void> clearAll() async {
    await _storage.delete(key: StorageKeys.accessToken);
    await _storage.delete(key: StorageKeys.refreshToken);
    await _storage.delete(key: StorageKeys.deviceId);
    await _storage.delete(key: StorageKeys.fcmToken);
  }
}
