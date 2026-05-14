/// Hằng số khóa cho flutter_secure_storage và SharedPreferences
abstract class StorageKeys {
  // Khóa bảo mật (Android Keystore / iOS Keychain)
  static const String accessToken = 'ev_access_token';
  static const String refreshToken = 'ev_refresh_token';
  static const String deviceId = 'ev_device_id';

  // SharedPreferences
  static const String authState = 'ev_auth_state';
  static const String chargingSessionState = 'ev_charging_session_state';
  static const String onboardingDone = 'ev_onboarding_done';
  static const String themeMode = 'ev_theme_mode';
  static const String fcmToken = 'ev_fcm_token';
}
