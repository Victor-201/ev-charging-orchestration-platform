/// Storage Key Constants for SharedPreferences and SecureStorage
abstract class StorageKeys {
  // Secure Storage cryptographic key references
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
