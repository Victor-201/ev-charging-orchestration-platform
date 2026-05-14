import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/station_entity.dart';

abstract class IStationRepository {
  Future<Either<Failure, List<StationEntity>>> getStations({
    required double lat,
    required double lng,
    required double radiusKm,
    String? connectorType,
    String? status,
  });

  Future<Either<Failure, StationEntity>> getStationById(String id);

  Future<Either<Failure, PricingEntity>> getChargerPricing({
    required String stationId,
    required String chargerId,
    required String connectorType,
    required DateTime startTime,
    required DateTime endTime,
  });

  /// Tìm kiếm trạm theo từ khóa (tên / địa chỉ).
  /// Backend dùng ILIKE — không phân biệt hoa thường.
  /// Trả danh sách tối đa [limit] trạm khớp.
  Future<Either<Failure, List<StationEntity>>> searchStations(
    String keyword, {
    int limit = 8,
  });
}
