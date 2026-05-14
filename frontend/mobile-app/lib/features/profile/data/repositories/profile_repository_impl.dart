import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import '../../domain/entities/profile_entity.dart';
import '../../domain/repositories/i_profile_repository.dart';
import '../../../../core/constants/api_paths.dart';
import '../../../../core/errors/error_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/dio_client.dart';

class ProfileRepositoryImpl implements IProfileRepository {
  final DioClient _client;
  ProfileRepositoryImpl({required DioClient client}) : _client = client;

  UserProfileEntity _parseProfile(Map<String, dynamic> d) => UserProfileEntity(
    id: d['id']?.toString() ?? '',
    email: d['email']?.toString() ?? '',
    fullName: d['fullName']?.toString() ?? '',
    phone: d['phone']?.toString(),
    dateOfBirth: d['dateOfBirth'] != null ? DateTime.parse(d['dateOfBirth'].toString()) : null,
    role: d['role']?.toString() ?? 'user',
    mfaEnabled: d['mfaEnabled'] == true,
  );

  VehicleEntity _parseVehicle(Map<String, dynamic> d) => VehicleEntity(
    id: d['id']?.toString() ?? '',
    plateNumber: d['plateNumber']?.toString() ?? '',
    model: d['model']?.toString() ?? '',
    brand: d['brand']?.toString() ?? '',
    connectorType: d['connectorType']?.toString() ?? 'Other',
    batteryCapacityKwh: (d['batteryCapacityKwh'] as num?)?.toDouble() ?? 0,
    isPrimary: d['isPrimary'] == true,
    macAddress: d['macAddress']?.toString(),
  );

  @override
  Future<Either<Failure, UserProfileEntity>> getMe() async {
    try { final r = await _client.get(ApiPaths.me); return Right(_parseProfile(r.data['data'] ?? {})); }
    on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, UserProfileEntity>> getProfile() async {
    try { final r = await _client.get(ApiPaths.userProfile); return Right(_parseProfile(r.data['data'] ?? {})); }
    on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, UserProfileEntity>> updateProfile({String? fullName, String? phone, DateTime? dateOfBirth}) async {
    try {
      final r = await _client.patch(ApiPaths.userProfile, data: {
        if (fullName != null) 'fullName': fullName,
        if (phone != null) 'phone': phone,
        if (dateOfBirth != null) 'dateOfBirth': dateOfBirth.toIso8601String(),
      });
      return Right(_parseProfile(r.data['data'] ?? {}));
    } on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, void>> changePassword({required String currentPassword, required String newPassword}) async {
    try {
      await _client.patch(ApiPaths.changePassword, data: {'currentPassword': currentPassword, 'newPassword': newPassword});
      return const Right(null);
    } on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, List<SessionDeviceEntity>>> getSessions() async {
    try {
      final r = await _client.get(ApiPaths.sessions);
      final list = r.data['data'] as List<dynamic>? ?? [];
      return Right(list.map((e) {
        final d = e as Map<String, dynamic>;
        return SessionDeviceEntity(
          id: d['id']?.toString() ?? '',
          ipAddress: d['ipAddress']?.toString() ?? '',
          userAgent: d['userAgent']?.toString() ?? '',
          createdAt: d['createdAt'] != null ? DateTime.parse(d['createdAt'].toString()) : DateTime.now(),
          isCurrentSession: d['isCurrent'] == true,
        );
      }).toList());
    } on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, void>> revokeSession(String id) async {
    try { await _client.delete(ApiPaths.sessionById(id)); return const Right(null); }
    on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, void>> revokeAllSessions() async {
    try { await _client.delete(ApiPaths.sessions); return const Right(null); }
    on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, List<VehicleEntity>>> getVehicles() async {
    try {
      final r = await _client.get(ApiPaths.vehicles);
      final list = r.data['data'] as List<dynamic>? ?? [];
      return Right(list.map((e) => _parseVehicle(e as Map<String, dynamic>)).toList());
    } on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, VehicleEntity>> addVehicle({required String plateNumber, required String model, required String brand, required String connectorType, required double batteryCapacityKwh}) async {
    try {
      final r = await _client.post(ApiPaths.vehicles, data: {'plateNumber': plateNumber, 'model': model, 'brand': brand, 'connectorType': connectorType, 'batteryCapacityKwh': batteryCapacityKwh});
      return Right(_parseVehicle(r.data['data'] ?? {}));
    } on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, VehicleEntity>> updateVehicle(String id, {String? plateNumber, String? model, String? brand, String? connectorType, double? batteryCapacityKwh}) async {
    try {
      final r = await _client.patch(ApiPaths.vehicleById(id), data: {
        if (plateNumber != null) 'plateNumber': plateNumber,
        if (model != null) 'model': model,
        if (brand != null) 'brand': brand,
        if (connectorType != null) 'connectorType': connectorType,
        if (batteryCapacityKwh != null) 'batteryCapacityKwh': batteryCapacityKwh,
      });
      return Right(_parseVehicle(r.data['data'] ?? {}));
    } on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, void>> deleteVehicle(String id) async {
    try { await _client.delete(ApiPaths.vehicleById(id)); return const Right(null); }
    on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, void>> setPrimaryVehicle(String id) async {
    try { await _client.post(ApiPaths.vehiclePrimary(id)); return const Right(null); }
    on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }

  @override
  Future<Either<Failure, void>> setAutoCharge(String id, String macAddress) async {
    try { await _client.patch(ApiPaths.vehicleAutocharge(id), data: {'macAddress': macAddress}); return const Right(null); }
    on DioException catch (e) { return Left(ErrorMapper.fromDioException(e)); }
  }
}
