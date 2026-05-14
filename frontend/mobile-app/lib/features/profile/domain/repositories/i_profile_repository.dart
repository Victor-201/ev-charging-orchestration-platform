import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/profile_entity.dart';

abstract class IProfileRepository {
  // [05] GET /auth/me
  Future<Either<Failure, UserProfileEntity>> getMe();
  // [15] GET /users/profile
  Future<Either<Failure, UserProfileEntity>> getProfile();
  // [16] PATCH /users/profile
  Future<Either<Failure, UserProfileEntity>> updateProfile({String? fullName, String? phone, DateTime? dateOfBirth});
  // [06] PATCH /auth/change-password
  Future<Either<Failure, void>> changePassword({required String currentPassword, required String newPassword});
  // [07] GET /auth/sessions
  Future<Either<Failure, List<SessionDeviceEntity>>> getSessions();
  // [08] DELETE /auth/sessions/:id
  Future<Either<Failure, void>> revokeSession(String id);
  // [09] DELETE /auth/sessions
  Future<Either<Failure, void>> revokeAllSessions();
  // [19] GET /vehicles
  Future<Either<Failure, List<VehicleEntity>>> getVehicles();
  // [20] POST /vehicles
  Future<Either<Failure, VehicleEntity>> addVehicle({required String plateNumber, required String model, required String brand, required String connectorType, required double batteryCapacityKwh});
  // [21] PATCH /vehicles/:id
  Future<Either<Failure, VehicleEntity>> updateVehicle(String id, {String? plateNumber, String? model, String? brand, String? connectorType, double? batteryCapacityKwh});
  // [22] DELETE /vehicles/:id
  Future<Either<Failure, void>> deleteVehicle(String id);
  // [23] POST /vehicles/:id/primary
  Future<Either<Failure, void>> setPrimaryVehicle(String id);
  // [25] PATCH /vehicles/:id/autocharge
  Future<Either<Failure, void>> setAutoCharge(String id, String macAddress);
}
