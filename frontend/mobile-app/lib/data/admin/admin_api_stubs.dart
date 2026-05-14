import 'package:dio/dio.dart';
import '../../core/constants/api_paths.dart';
import '../../core/network/dio_client.dart';
import 'admin_response_dtos.dart';

/// Admin API stubs — TASK-196
/// Typed wrappers cho tất cả 27 admin/system endpoints
/// Chỉ dành cho Admin/Staff — không gọi từ người dùng thường
class AdminApiStubs {
  final DioClient _client;
  AdminApiStubs({required DioClient client}) : _client = client;

  // ── IAM Admin ──────────────────────────────────────────────────────────────

  // [10] POST /auth/roles/assign
  Future<RoleOperationDto> assignRole(String userId, String role) async {
    final r = await _client.post(ApiPaths.rolesAssign, data: {'userId': userId, 'role': role});
    return RoleOperationDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [11] POST /auth/roles/revoke
  Future<RoleOperationDto> revokeRole(String userId, String role) async {
    final r = await _client.post(ApiPaths.rolesRevoke, data: {'userId': userId, 'role': role});
    return RoleOperationDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [17] GET /users/:id/audit-logs
  Future<List<AuditLogDto>> getUserAuditLogs(String userId) async {
    final r = await _client.get(ApiPaths.userAuditLogs(userId));
    final list = r.data as List<dynamic>;
    return list.map((e) => AuditLogDto.fromJson(e as Map<String, dynamic>)).toList();
  }

  // [18] DELETE /users/:id
  Future<void> deleteUser(String userId) => _client.delete(ApiPaths.deleteUser(userId));

  // ── Infra Admin ────────────────────────────────────────────────────────────

  // [27] POST /stations
  Future<StationAdminDto> createStation(Map<String, dynamic> data) async {
    final r = await _client.post(ApiPaths.stations, data: data);
    return StationAdminDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [29] PATCH /stations/:id
  Future<StationAdminDto> updateStation(String id, Map<String, dynamic> data) async {
    final r = await _client.patch(ApiPaths.stationById(id), data: data);
    return StationAdminDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [30] DELETE /stations/:id
  Future<void> deleteStation(String id) => _client.delete(ApiPaths.stationById(id));

  // [31] POST /stations/:id/chargers
  Future<ChargerAdminDto> addCharger(String stationId, Map<String, dynamic> data) async {
    final r = await _client.post(ApiPaths.stationChargers(stationId), data: data);
    return ChargerAdminDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [32] PATCH /stations/:id/chargers/:cid/status
  Future<ChargerAdminDto> updateChargerStatus(String stationId, String chargerId, String status) async {
    final r = await _client.patch(ApiPaths.chargerStatus(stationId, chargerId), data: {'status': status});
    return ChargerAdminDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [34] POST /stations/pricing/calculate
  Future<PricingCalculationDto> calculatePricing(Map<String, dynamic> data) async {
    final r = await _client.post(ApiPaths.pricingCalculate, data: data);
    return PricingCalculationDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [35] GET /stations/pricing-rules
  Future<List<PricingRuleDto>> getPricingRules() async {
    final r = await _client.get(ApiPaths.pricingRules);
    final list = r.data as List<dynamic>;
    return list.map((e) => PricingRuleDto.fromJson(e as Map<String, dynamic>)).toList();
  }

  // [36] POST /stations/pricing-rules
  Future<PricingRuleDto> createPricingRule(Map<String, dynamic> data) async {
    final r = await _client.post(ApiPaths.pricingRules, data: data);
    return PricingRuleDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [37] PATCH /stations/pricing-rules/:ruleId
  Future<PricingRuleDto> updatePricingRule(String ruleId, Map<String, dynamic> data) async {
    final r = await _client.patch(ApiPaths.pricingRuleById(ruleId), data: data);
    return PricingRuleDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [38] PATCH /stations/pricing-rules/:ruleId/deactivate
  Future<PricingRuleDto> deactivatePricingRule(String ruleId) async {
    final r = await _client.patch(ApiPaths.pricingRuleDeactivate(ruleId));
    return PricingRuleDto.fromJson(r.data as Map<String, dynamic>);
  }

  // ── Session Admin ──────────────────────────────────────────────────────────

  // [49] POST /charging/admin/stop/:id
  Future<AdminStopSessionDto> adminStopSession(String sessionId) async {
    final r = await _client.post(ApiPaths.chargingAdminStop(sessionId));
    return AdminStopSessionDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [50] POST /charging/telemetry/:id (system ingest)
  Future<TelemetryIngestDto> ingestTelemetry(String sessionId, Map<String, dynamic> data) async {
    final r = await _client.post(ApiPaths.chargingTelemetry(sessionId), data: data);
    return TelemetryIngestDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [52] GET /charging/charger/:chargerId/active
  Future<ChargerActiveSessionDto> getChargerActiveSession(String chargerId) async {
    final r = await _client.get(ApiPaths.chargerActiveSession(chargerId));
    return ChargerActiveSessionDto.fromJson(r.data as Map<String, dynamic>);
  }

  // ── Billing Admin ──────────────────────────────────────────────────────────

  // [58] POST /payments/:id/refund
  Future<RefundDto> refundPayment(String paymentId) async {
    final r = await _client.post(ApiPaths.paymentRefund(paymentId));
    return RefundDto.fromJson(r.data as Map<String, dynamic>);
  }

  // ── Notification Admin ─────────────────────────────────────────────────────

  // [69] GET /devices
  Future<List<DeviceDto>> getDevices() async {
    final r = await _client.get(ApiPaths.devices);
    final list = r.data as List<dynamic>;
    return list.map((e) => DeviceDto.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  // [72] GET /analytics/system
  Future<SystemAnalyticsDto> getSystemAnalytics() async {
    final r = await _client.get(ApiPaths.analyticsSystem);
    return SystemAnalyticsDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [73] GET /analytics/revenue
  Future<RevenueAnalyticsDto> getRevenueAnalytics() async {
    final r = await _client.get(ApiPaths.analyticsRevenue);
    return RevenueAnalyticsDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [74] GET /analytics/usage
  Future<UsageAnalyticsDto> getUsageAnalytics() async {
    final r = await _client.get(ApiPaths.analyticsUsage);
    return UsageAnalyticsDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [75] GET /analytics/peak-hours
  Future<PeakHoursDto> getPeakHoursAnalytics() async {
    final r = await _client.get(ApiPaths.analyticsPeakHours);
    return PeakHoursDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [76] GET /analytics/users/:userId
  Future<SystemAnalyticsDto> getUserAnalytics(String userId) async {
    final r = await _client.get(ApiPaths.analyticsUser(userId));
    return SystemAnalyticsDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [77] GET /analytics/stations/:stationId/metrics
  Future<StationMetricsDto> getStationMetrics(String stationId) async {
    final r = await _client.get(ApiPaths.analyticsStation(stationId));
    return StationMetricsDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [78] GET /analytics/dashboard
  Future<DashboardDto> getDashboardAnalytics() async {
    final r = await _client.get(ApiPaths.analyticsDashboard);
    return DashboardDto.fromJson(r.data as Map<String, dynamic>);
  }

  // ── Telemetry System ───────────────────────────────────────────────────────

  // [79] POST /telemetry/ingest
  Future<TelemetryIngestDto> ingestTelemetryBatch(Map<String, dynamic> data) async {
    final r = await _client.post(ApiPaths.telemetryIngest, data: data);
    return TelemetryIngestDto.fromJson(r.data as Map<String, dynamic>);
  }

  // [80] POST /telemetry/ingest/:id/:session
  Future<TelemetryIngestDto> ingestTelemetrySession(String id, String session, Map<String, dynamic> data) async {
    final r = await _client.post(ApiPaths.telemetryIngestSession(id, session), data: data);
    return TelemetryIngestDto.fromJson(r.data as Map<String, dynamic>);
  }

  // ── OCPP System ────────────────────────────────────────────────────────────

  // [81] GET /ocpp/health
  Future<OcppHealthDto> getOcppHealth() async {
    final r = await _client.get(ApiPaths.ocppHealth);
    return OcppHealthDto.fromJson(r.data as Map<String, dynamic>);
  }
}
