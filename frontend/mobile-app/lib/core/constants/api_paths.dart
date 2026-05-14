/// Đường dẫn API — lấy từ Coverage Matrix (82 endpoints)
abstract class ApiPaths {
  // [01-14] IAM Service — Xác thực
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String changePassword = '/auth/change-password';
  static const String sessions = '/auth/sessions';
  static String sessionById(String id) => '/auth/sessions/$id';
  static const String rolesAssign = '/auth/roles/assign';
  static const String rolesRevoke = '/auth/roles/revoke';
  static const String mfaSetup = '/auth/mfa/setup';
  static const String mfaVerify = '/auth/mfa/verify';
  static const String mfaDisable = '/auth/mfa/disable';
  static const String verifyEmail = '/auth/verify-email';
  static const String resendVerification = '/auth/resend-verification';

  // [15-18] IAM Service — Người dùng
  static const String userProfile = '/users/profile';
  static String userAuditLogs(String id) => '/users/$id/audit-logs';
  static String deleteUser(String id) => '/users/$id';

  // [19-25] IAM Service — Phương tiện
  static const String vehicles = '/vehicles';
  static String vehicleById(String id) => '/vehicles/$id';
  static String vehiclePrimary(String id) => '/vehicles/$id/primary';
  static String vehicleAudit(String id) => '/vehicles/$id/audit';
  static String vehicleAutocharge(String id) => '/vehicles/$id/autocharge';

  // [26-38] Infra Service — Trạm sạc
  static const String stations = '/stations';
  static String stationById(String id) => '/stations/$id';
  static String stationChargers(String stationId) =>
      '/stations/$stationId/chargers';
  static String chargerStatus(String stationId, String chargerId) =>
      '/stations/$stationId/chargers/$chargerId/status';
  static String chargerPricing(String stationId, String chargerId) =>
      '/stations/$stationId/chargers/$chargerId/pricing';
  static const String pricingCalculate = '/stations/pricing/calculate';
  static const String pricingRules = '/stations/pricing-rules';
  static String pricingRuleById(String ruleId) =>
      '/stations/pricing-rules/$ruleId';
  static String pricingRuleDeactivate(String ruleId) =>
      '/stations/pricing-rules/$ruleId/deactivate';

  // [39-46] Session Service — Đặt lịch & Hàng đợi
  static const String bookingAvailability = '/bookings/availability';
  static const String myBookings = '/bookings/me';
  static const String bookings = '/bookings';
  static String bookingById(String id) => '/bookings/$id';
  static const String queue = '/bookings/queue';
  static String leaveQueue(String chargerId) =>
      '/bookings/queue/$chargerId';
  static String queuePosition(String chargerId) =>
      '/bookings/queue/$chargerId/position';

  // [47-53] Session Service — Phiên sạc
  static const String startSession = '/charging/start';
  static String stopSession(String id) => '/charging/stop/$id';
  static String chargingSessionById(String id) => '/charging/session/$id';
  static const String chargingHistory = '/charging/history';
  static String chargingAdminStop(String id) => '/charging/admin/stop/$id';
  static String chargingTelemetry(String id) => '/charging/telemetry/$id';
  static String chargerActiveSession(String chargerId) =>
      '/charging/charger/$chargerId/active';

  // [54-62] Billing Service — Thanh toán & Ví
  static const String paymentsCreate = '/payments/create';
  static const String paymentsPay = '/payments/pay';
  static const String vnpayReturn = '/payments/vnpay-return';
  static String paymentById(String id) => '/payments/$id';
  static String paymentRefund(String id) => '/payments/$id/refund';
  static const String walletBalance = '/wallet/balance';
  static const String walletTopup = '/wallet/topup';
  static const String walletPay = '/wallet/pay';
  static const String transactions = '/transactions';

  // [63-71] Notification Service
  static const String notifications = '/notifications';
  static const String notificationsUnread = '/notifications/unread';
  static String notificationRead(String id) => '/notifications/$id/read';
  static const String notificationsReadAll = '/notifications/read-all';
  static const String devicesRegister = '/devices/register';
  static String deviceById(String id) => '/devices/$id';
  static const String devices = '/devices';
  static const String preferences = '/preferences';

  // [72-81] Analytics & Telemetry (Admin stubs)
  static const String analyticsSystem = '/analytics/system';
  static const String analyticsRevenue = '/analytics/revenue';
  static const String analyticsUsage = '/analytics/usage';
  static const String analyticsPeakHours = '/analytics/peak-hours';
  static String analyticsUser(String userId) =>
      '/analytics/users/$userId';
  static String analyticsStation(String stationId) =>
      '/analytics/stations/$stationId/metrics';
  static const String analyticsDashboard = '/analytics/dashboard';
  static const String telemetryIngest = '/telemetry/ingest';
  static String telemetryIngestSession(String id, String session) =>
      '/telemetry/ingest/$id/$session';
  static const String ocppHealth = '/ocpp/health';

  // WebSocket
  static String ocppWebSocket(String chargerId) => '/ocpp/$chargerId';
}
