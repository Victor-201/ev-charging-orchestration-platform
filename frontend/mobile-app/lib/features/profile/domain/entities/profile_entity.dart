import 'package:equatable/equatable.dart';

class UserProfileEntity extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String? phone;
  final DateTime? dateOfBirth;
  final String role;
  final bool mfaEnabled;

  const UserProfileEntity({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    this.dateOfBirth,
    required this.role,
    required this.mfaEnabled,
  });

  @override
  List<Object?> get props => [id, email, fullName, mfaEnabled];
}

class VehicleEntity extends Equatable {
  final String id;
  final String plateNumber;
  final String model;
  final String brand;
  final String connectorType; // CCS | CHAdeMO | Type2 | GB/T | Other
  final double batteryCapacityKwh;
  final bool isPrimary;
  final String? macAddress; // for AutoCharge

  const VehicleEntity({
    required this.id,
    required this.plateNumber,
    required this.model,
    required this.brand,
    required this.connectorType,
    required this.batteryCapacityKwh,
    required this.isPrimary,
    this.macAddress,
  });

  @override
  List<Object?> get props => [id, plateNumber, isPrimary];
}

class SessionDeviceEntity extends Equatable {
  final String id;
  final String ipAddress;
  final String userAgent;
  final DateTime createdAt;
  final bool isCurrentSession;

  const SessionDeviceEntity({
    required this.id,
    required this.ipAddress,
    required this.userAgent,
    required this.createdAt,
    required this.isCurrentSession,
  });

  @override
  List<Object?> get props => [id];
}
