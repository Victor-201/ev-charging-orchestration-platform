import 'package:equatable/equatable.dart';

/// Entity trạm sạc từ Infra Service
class StationEntity extends Equatable {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final String status;
  final List<ChargerEntity> chargers;
  final double? distanceKm;

  const StationEntity({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.status,
    required this.chargers,
    this.distanceKm,
  });

  @override
  List<Object?> get props => [id, name, latitude, longitude, status];
}

/// Entity trạm sạc — từ ChargerStatus enum trong charger.aggregate.ts
class ChargerEntity extends Equatable {
  final String id;
  final String name;
  final String status; // AVAILABLE | IN_USE | RESERVED | OFFLINE | FAULTED
  final String connectorType; // CCS | CHAdeMO | Type2 | GB/T | Other
  final double powerKw;
  final double? pricePerKwh;

  const ChargerEntity({
    required this.id,
    required this.name,
    required this.status,
    required this.connectorType,
    required this.powerKw,
    this.pricePerKwh,
  });

  @override
  List<Object?> get props => [id, status, connectorType, powerKw];
}

/// Entity giá điện
class PricingEntity extends Equatable {
  final String chargerId;
  final double pricePerKwh;
  final double? idleFeePerMinute;
  final double? totalEstimateVnd;

  const PricingEntity({
    required this.chargerId,
    required this.pricePerKwh,
    this.idleFeePerMinute,
    this.totalEstimateVnd,
  });

  @override
  List<Object?> get props => [chargerId, pricePerKwh, idleFeePerMinute, totalEstimateVnd];
}
