/// Navigation Route Names and Paths mapped from §3.3 specifications
abstract class RouteNames {
  // Startup / Welcome Screens
  static const String splash = 'splash';
  static const String welcome = 'welcome';

  // Authentication
  static const String login = 'login';
  static const String register = 'register';
  static const String mfaVerify = 'mfa-verify';

  // Map / Navigation
  static const String map = 'map';
  static const String stationDetail = 'station-detail';
  static const String routeNavigation = 'route-navigation';

  // Reservation / Scheduler
  static const String bookingHistory = 'booking-history';
  static const String bookingNew = 'booking-new';
  static const String bookingDetail = 'booking-detail';
  static const String queueStatus = 'queue-status';

  // Active Charging Hub
  static const String chargingHub = 'charging-hub';
  static const String qrScan = 'qr-scan';
  static const String activeSession = 'active-session';
  static const String sessionSummary = 'session-summary';

  // Wallet / Deposits
  static const String walletDashboard = 'wallet-dashboard';
  static const String topUp = 'top-up';
  static const String vnpayProcessing = 'vnpay-processing';

  // Push Notifications
  static const String notifications = 'notifications';

  // User Profiles
  static const String profile = 'profile';
  static const String vehicles = 'vehicles';
  static const String securitySettings = 'security-settings';
}

/// Complete path parameters for go_router
abstract class RoutePaths {
  static const String splash = '/splash';
  static const String welcome = '/welcome';

  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String mfaVerify = '/auth/mfa';

  static const String map = '/map';
  static const String stationDetail = '/map/station/:id';
  static const String routeNavigation = '/map/station/:id/route';

  static const String bookingHistory = '/bookings';
  static const String bookingNew = '/bookings/new';
  static const String bookingDetail = '/bookings/:id';
  static const String queueStatus = '/bookings/queue/:chargerId';

  static const String chargingHub = '/charging';
  static const String qrScan = '/charging/scan';
  static const String activeSession = '/charging/session/:id';
  static const String sessionSummary = '/charging/session/:id/summary';

  static const String walletDashboard = '/wallet';
  static const String topUp = '/wallet/topup';
  static const String vnpayProcessing = '/wallet/topup/processing';

  static const String notifications = '/notifications';

  static const String profile = '/profile';
  static const String vehicles = '/profile/vehicles';
  static const String securitySettings = '/profile/security';
}
