import 'package:equatable/equatable.dart';

// ─── DTOs cho Admin/System endpoints — TASK-196 ───────────────────────────────
// Tương ứng với response schema từ backend microservices

/// [10][11] Role assignment/revoke response
class RoleOperationDto extends Equatable {
  final String userId;
  final String role;
  final String message;
  const RoleOperationDto({required this.userId, required this.role, required this.message});
  factory RoleOperationDto.fromJson(Map<String, dynamic> j) =>
      RoleOperationDto(userId: j['userId'] as String, role: j['role'] as String, message: j['message'] as String? ?? 'OK');
  @override List<Object?> get props => [userId, role];
}

/// [17] Audit log entry
class AuditLogDto extends Equatable {
  final String id;
  final String action;
  final String entityType;
  final String entityId;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  const AuditLogDto({required this.id, required this.action, required this.entityType, required this.entityId, this.metadata, required this.createdAt});
  factory AuditLogDto.fromJson(Map<String, dynamic> j) => AuditLogDto(
    id: j['id'] as String, action: j['action'] as String,
    entityType: j['entityType'] as String, entityId: j['entityId'] as String,
    metadata: j['metadata'] as Map<String, dynamic>?,
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
  @override List<Object?> get props => [id, action, createdAt];
}

/// [27][29] Station upsert response
class StationAdminDto extends Equatable {
  final String id;
  final String name;
  final double lat;
  final double lng;
  final String address;
  final String status;
  final DateTime createdAt;
  const StationAdminDto({required this.id, required this.name, required this.lat, required this.lng, required this.address, required this.status, required this.createdAt});
  factory StationAdminDto.fromJson(Map<String, dynamic> j) => StationAdminDto(
    id: j['id'] as String, name: j['name'] as String,
    lat: (j['lat'] as num).toDouble(), lng: (j['lng'] as num).toDouble(),
    address: j['address'] as String, status: j['status'] as String,
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
  @override List<Object?> get props => [id, status];
}

/// [31][32] Charger admin response
class ChargerAdminDto extends Equatable {
  final String id;
  final String stationId;
  final String connectorType;
  final String status;
  final double maxPowerKw;
  const ChargerAdminDto({required this.id, required this.stationId, required this.connectorType, required this.status, required this.maxPowerKw});
  factory ChargerAdminDto.fromJson(Map<String, dynamic> j) => ChargerAdminDto(
    id: j['id'] as String, stationId: j['stationId'] as String,
    connectorType: j['connectorType'] as String, status: j['status'] as String,
    maxPowerKw: (j['maxPowerKw'] as num).toDouble(),
  );
  @override List<Object?> get props => [id, status];
}

/// [34] Pricing calculation result
class PricingCalculationDto extends Equatable {
  final double estimatedCostVnd;
  final double pricePerKwh;
  final double estimatedKwh;
  final String ruleId;
  const PricingCalculationDto({required this.estimatedCostVnd, required this.pricePerKwh, required this.estimatedKwh, required this.ruleId});
  factory PricingCalculationDto.fromJson(Map<String, dynamic> j) => PricingCalculationDto(
    estimatedCostVnd: (j['estimatedCostVnd'] as num).toDouble(),
    pricePerKwh: (j['pricePerKwh'] as num).toDouble(),
    estimatedKwh: (j['estimatedKwh'] as num).toDouble(),
    ruleId: j['ruleId'] as String,
  );
  @override List<Object?> get props => [ruleId, estimatedCostVnd];
}

/// [35][36][37][38] Pricing rule
class PricingRuleDto extends Equatable {
  final String id;
  final String name;
  final double pricePerKwh;
  final String? connectorType;
  final String? startHour; // "08:00"
  final String? endHour;   // "22:00"
  final bool isActive;
  final DateTime createdAt;
  const PricingRuleDto({required this.id, required this.name, required this.pricePerKwh, this.connectorType, this.startHour, this.endHour, required this.isActive, required this.createdAt});
  factory PricingRuleDto.fromJson(Map<String, dynamic> j) => PricingRuleDto(
    id: j['id'] as String, name: j['name'] as String,
    pricePerKwh: (j['pricePerKwh'] as num).toDouble(),
    connectorType: j['connectorType'] as String?,
    startHour: j['startHour'] as String?, endHour: j['endHour'] as String?,
    isActive: j['isActive'] as bool? ?? true,
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
  @override List<Object?> get props => [id, isActive];
}

/// [49] Admin stop session response
class AdminStopSessionDto extends Equatable {
  final String sessionId;
  final String status;
  final String message;
  const AdminStopSessionDto({required this.sessionId, required this.status, required this.message});
  factory AdminStopSessionDto.fromJson(Map<String, dynamic> j) => AdminStopSessionDto(
    sessionId: j['sessionId'] as String, status: j['status'] as String, message: j['message'] as String? ?? 'OK',
  );
  @override List<Object?> get props => [sessionId, status];
}

/// [52] Charger active session
class ChargerActiveSessionDto extends Equatable {
  final String? sessionId;
  final String? userId;
  final double? socPercent;
  final double? powerKw;
  final DateTime? startedAt;
  const ChargerActiveSessionDto({this.sessionId, this.userId, this.socPercent, this.powerKw, this.startedAt});
  factory ChargerActiveSessionDto.fromJson(Map<String, dynamic> j) => ChargerActiveSessionDto(
    sessionId: j['sessionId'] as String?, userId: j['userId'] as String?,
    socPercent: (j['socPercent'] as num?)?.toDouble(),
    powerKw: (j['powerKw'] as num?)?.toDouble(),
    startedAt: j['startedAt'] != null ? DateTime.parse(j['startedAt'] as String) : null,
  );
  @override List<Object?> get props => [sessionId];
}

/// [58] Payment refund response
class RefundDto extends Equatable {
  final String paymentId;
  final double refundAmountVnd;
  final String status;
  const RefundDto({required this.paymentId, required this.refundAmountVnd, required this.status});
  factory RefundDto.fromJson(Map<String, dynamic> j) => RefundDto(
    paymentId: j['paymentId'] as String, refundAmountVnd: (j['refundAmountVnd'] as num).toDouble(), status: j['status'] as String,
  );
  @override List<Object?> get props => [paymentId, status];
}

/// [69] Device list entry
class DeviceDto extends Equatable {
  final String id;
  final String userId;
  final String pushToken;
  final String platform;
  final String? deviceName;
  final DateTime lastSeen;
  const DeviceDto({required this.id, required this.userId, required this.pushToken, required this.platform, this.deviceName, required this.lastSeen});
  factory DeviceDto.fromJson(Map<String, dynamic> j) => DeviceDto(
    id: j['id'] as String, userId: j['userId'] as String, pushToken: j['pushToken'] as String,
    platform: j['platform'] as String, deviceName: j['deviceName'] as String?,
    lastSeen: DateTime.parse(j['lastSeen'] as String),
  );
  @override List<Object?> get props => [id, platform];
}

/// [72]–[78] Analytics DTOs
class SystemAnalyticsDto extends Equatable {
  final int totalUsers;
  final int totalStations;
  final int totalSessions;
  final double totalRevenueVnd;
  final double avgSessionKwh;
  const SystemAnalyticsDto({required this.totalUsers, required this.totalStations, required this.totalSessions, required this.totalRevenueVnd, required this.avgSessionKwh});
  factory SystemAnalyticsDto.fromJson(Map<String, dynamic> j) => SystemAnalyticsDto(
    totalUsers: j['totalUsers'] as int, totalStations: j['totalStations'] as int,
    totalSessions: j['totalSessions'] as int, totalRevenueVnd: (j['totalRevenueVnd'] as num).toDouble(),
    avgSessionKwh: (j['avgSessionKwh'] as num).toDouble(),
  );
  @override List<Object?> get props => [totalSessions, totalRevenueVnd];
}

class RevenueAnalyticsDto extends Equatable {
  final double totalVnd;
  final double topupVnd;
  final double chargingVnd;
  final List<Map<String, dynamic>> dailyBreakdown;
  const RevenueAnalyticsDto({required this.totalVnd, required this.topupVnd, required this.chargingVnd, required this.dailyBreakdown});
  factory RevenueAnalyticsDto.fromJson(Map<String, dynamic> j) => RevenueAnalyticsDto(
    totalVnd: (j['totalVnd'] as num).toDouble(), topupVnd: (j['topupVnd'] as num).toDouble(),
    chargingVnd: (j['chargingVnd'] as num).toDouble(),
    dailyBreakdown: (j['dailyBreakdown'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
  );
  @override List<Object?> get props => [totalVnd];
}

class UsageAnalyticsDto extends Equatable {
  final int activeSessions;
  final int todaySessions;
  final double todayKwh;
  const UsageAnalyticsDto({required this.activeSessions, required this.todaySessions, required this.todayKwh});
  factory UsageAnalyticsDto.fromJson(Map<String, dynamic> j) => UsageAnalyticsDto(
    activeSessions: j['activeSessions'] as int, todaySessions: j['todaySessions'] as int, todayKwh: (j['todayKwh'] as num).toDouble(),
  );
  @override List<Object?> get props => [activeSessions, todaySessions];
}

class PeakHoursDto extends Equatable {
  final List<Map<String, dynamic>> hourlyUsage; // [{hour: 8, sessions: 12}, ...]
  final int peakHour;
  const PeakHoursDto({required this.hourlyUsage, required this.peakHour});
  factory PeakHoursDto.fromJson(Map<String, dynamic> j) => PeakHoursDto(
    hourlyUsage: (j['hourlyUsage'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    peakHour: j['peakHour'] as int? ?? 0,
  );
  @override List<Object?> get props => [peakHour];
}

class StationMetricsDto extends Equatable {
  final String stationId;
  final int totalSessions;
  final double totalKwh;
  final double totalRevenueVnd;
  final double avgOccupancyPercent;
  final Map<String, int> statusBreakdown; // {AVAILABLE: 2, IN_USE: 1, ...}
  const StationMetricsDto({required this.stationId, required this.totalSessions, required this.totalKwh, required this.totalRevenueVnd, required this.avgOccupancyPercent, required this.statusBreakdown});
  factory StationMetricsDto.fromJson(Map<String, dynamic> j) => StationMetricsDto(
    stationId: j['stationId'] as String, totalSessions: j['totalSessions'] as int,
    totalKwh: (j['totalKwh'] as num).toDouble(), totalRevenueVnd: (j['totalRevenueVnd'] as num).toDouble(),
    avgOccupancyPercent: (j['avgOccupancyPercent'] as num).toDouble(),
    statusBreakdown: (j['statusBreakdown'] as Map<String, dynamic>?)?.cast<String, int>() ?? {},
  );
  @override List<Object?> get props => [stationId, totalSessions];
}

class DashboardDto extends Equatable {
  final SystemAnalyticsDto system;
  final RevenueAnalyticsDto revenue;
  final UsageAnalyticsDto usage;
  const DashboardDto({required this.system, required this.revenue, required this.usage});
  factory DashboardDto.fromJson(Map<String, dynamic> j) => DashboardDto(
    system: SystemAnalyticsDto.fromJson(j['system'] as Map<String, dynamic>),
    revenue: RevenueAnalyticsDto.fromJson(j['revenue'] as Map<String, dynamic>),
    usage: UsageAnalyticsDto.fromJson(j['usage'] as Map<String, dynamic>),
  );
  @override List<Object?> get props => [system, revenue];
}

/// [79][80] Telemetry ingest response
class TelemetryIngestDto extends Equatable {
  final bool accepted;
  final String? sessionId;
  final DateTime processedAt;
  const TelemetryIngestDto({required this.accepted, this.sessionId, required this.processedAt});
  factory TelemetryIngestDto.fromJson(Map<String, dynamic> j) => TelemetryIngestDto(
    accepted: j['accepted'] as bool? ?? false,
    sessionId: j['sessionId'] as String?,
    processedAt: j['processedAt'] != null ? DateTime.parse(j['processedAt'] as String) : DateTime.now(),
  );
  @override List<Object?> get props => [accepted, processedAt];
}

/// [81] OCPP health check
class OcppHealthDto extends Equatable {
  final String status; // 'ok' | 'degraded' | 'down'
  final int connectedChargers;
  final int activeTransactions;
  final DateTime checkedAt;
  const OcppHealthDto({required this.status, required this.connectedChargers, required this.activeTransactions, required this.checkedAt});
  factory OcppHealthDto.fromJson(Map<String, dynamic> j) => OcppHealthDto(
    status: j['status'] as String, connectedChargers: j['connectedChargers'] as int? ?? 0,
    activeTransactions: j['activeTransactions'] as int? ?? 0,
    checkedAt: j['checkedAt'] != null ? DateTime.parse(j['checkedAt'] as String) : DateTime.now(),
  );
  @override List<Object?> get props => [status, connectedChargers];
}
