import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/charging_session_entity.dart';

abstract class IChargingSessionRepository {
  // [54] Bắt đầu phiên sạc
  Future<Either<Failure, ChargingSessionEntity>> startSession({
    required String bookingId,
    required String qrToken,
  });

  // [55] Dừng phiên sạc
  Future<Either<Failure, ChargingSessionEntity>> stopSession(
      String sessionId);

  // [56] Chi tiết phiên sạc đang hoạt động
  Future<Either<Failure, ChargingSessionEntity>> getActiveSession(
      String sessionId);

  // [57] Lịch sử phiên sạc
  Future<Either<Failure, List<ChargingSessionEntity>>> getSessionHistory({
    int? page,
    int? limit,
  });

  // Khởi động WebSocket cho telemetry
  void connectTelemetry({
    required String chargerId,
    required void Function(TelemetryData) onData,
  });

  void disconnectTelemetry();
}
