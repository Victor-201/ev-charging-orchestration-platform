import 'package:equatable/equatable.dart';

/// Domain entity representing charging transactions
/// States: INITIATED → AUTHORIZED → CHARGING → STOPPING → COMPLETED/ERROR
class ChargingSessionEntity extends Equatable {
  final String id;
  final String chargerId;
  final String status; // INITIATED | AUTHORIZED | CHARGING | STOPPING | COMPLETED | ERROR
  final double energyKwh;
  final double socPercent; // 0–100
  final double powerW;
  final double voltageV;
  final double currentA;
  final double temperatureC;
  final double amountDue;
  final DateTime startedAt;
  final DateTime? endedAt;
  final String? transactionId;

  const ChargingSessionEntity({
    required this.id,
    required this.chargerId,
    required this.status,
    required this.energyKwh,
    required this.socPercent,
    required this.powerW,
    this.voltageV = 0,
    this.currentA = 0,
    this.temperatureC = 0,
    required this.amountDue,
    required this.startedAt,
    this.endedAt,
    this.transactionId,
  });

  bool get isActive =>
      status == 'INITIATED' ||
      status == 'AUTHORIZED' ||
      status == 'CHARGING' ||
      status == 'STOPPING';

  bool get isCharging => status == 'CHARGING';

  Duration get elapsed =>
      (endedAt ?? DateTime.now()).difference(startedAt);

  @override
  List<Object?> get props => [
        id,
        status,
        energyKwh,
        socPercent,
        powerW,
        voltageV,
        currentA,
        temperatureC,
        amountDue,
      ];
}

/// Core ocpp socket telemetry state model
class TelemetryData extends Equatable {
  final String chargerId;
  final double powerW;
  final double socPercent;
  final double energyKwh;
  final double voltageV;
  final double currentA;
  final double temperatureC;
  final double amountDue;
  final DateTime timestamp;

  const TelemetryData({
    required this.chargerId,
    required this.powerW,
    required this.socPercent,
    required this.energyKwh,
    this.voltageV = 0,
    this.currentA = 0,
    this.temperatureC = 0,
    required this.amountDue,
    required this.timestamp,
  });

  @override
  List<Object?> get props => [
        chargerId,
        powerW,
        socPercent,
        energyKwh,
        voltageV,
        currentA,
        temperatureC,
        amountDue,
        timestamp,
      ];
}
