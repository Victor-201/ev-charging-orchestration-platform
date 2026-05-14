import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/storage_keys.dart';

/// Dịch vụ SharedPreferences cho dữ liệu không nhạy cảm
class SharedPrefsService {
  final SharedPreferences _prefs;

  const SharedPrefsService(this._prefs);

  Future<void> setOnboardingDone() =>
      _prefs.setBool(StorageKeys.onboardingDone, true);

  bool get isOnboardingDone =>
      _prefs.getBool(StorageKeys.onboardingDone) ?? false;

  Future<void> setThemeMode(String mode) =>
      _prefs.setString(StorageKeys.themeMode, mode);

  String get themeMode =>
      _prefs.getString(StorageKeys.themeMode) ?? 'system';
}
