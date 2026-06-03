import 'dart:async';
import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../domain/entities/charging_session_entity.dart';
import '../../domain/repositories/i_charging_session_repository.dart';
import '../../../../core/constants/api_paths.dart';
import '../../../../core/errors/error_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/config/app_config.dart';

class ChargingSessionModel extends ChargingSessionEntity {
  const ChargingSessionModel({
    required super.id,
    required super.chargerId,
    required super.status,
    required super.energyKwh,
    required super.socPercent,
    required super.powerW,
    required super.amountDue,
    required super.startedAt,
    super.endedAt,
    super.transactionId,
  });

  factory ChargingSessionModel.fromJson(Map<String, dynamic> json) {
    return ChargingSessionModel(
      id: json['id']?.toString() ?? '',
      chargerId: json['chargerId']?.toString() ?? '',
      status: json['status']?.toString() ?? 'INITIATED',
      energyKwh: (json['energyKwh'] as num?)?.toDouble() ?? 0,
      socPercent: (json['socPercent'] as num?)?.toDouble() ?? 0,
      powerW: (json['powerW'] as num?)?.toDouble() ?? 0,
      voltageV: (json['voltageV'] as num?)?.toDouble() ?? 0,
      currentA: (json['currentA'] as num?)?.toDouble() ?? 0,
      temperatureC: (json['temperatureC'] as num?)?.toDouble() ?? 0,
      amountDue: (json['amountDue'] as num?)?.toDouble() ?? 0,
      startedAt: json['startedAt'] != null
          ? DateTime.parse(json['startedAt'].toString())
          : DateTime.now(),
      endedAt: json['endedAt'] != null
          ? DateTime.parse(json['endedAt'].toString())
          : null,
      transactionId: json['transactionId']?.toString(),
    );
  }
}

class ChargingSessionRepositoryImpl
    implements IChargingSessionRepository {
  final DioClient _client;
  io.Socket? _socket;

  ChargingSessionRepositoryImpl({required DioClient client})
      : _client = client;

  @override
  Future<Either<Failure, ChargingSessionEntity>> startSession({
    required String chargerId,
    String? bookingId,
    String? qrToken,
  }) async {
    try {
      final response = await _client.post(
        ApiPaths.startSession,
        // POST /charging/start: chargerId required, bookingId and qrToken optional
        data: {
          'chargerId': chargerId,
          if (bookingId != null) 'bookingId': bookingId,
          if (qrToken != null) 'qrToken': qrToken,
        },
        withIdempotency: true,
      );
      // Response may be flat or wrapped in data
      final raw = response.data;
      final data = raw is Map<String, dynamic>
          ? ((raw['data'] as Map<String, dynamic>?) ?? raw)
          : <String, dynamic>{};
      return Right(ChargingSessionModel.fromJson(data));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, ChargingSessionEntity>> stopSession(
      String sessionId) async {
    try {
      final response = await _client.post(
        ApiPaths.stopSession(sessionId),
        withIdempotency: true,
      );
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      return Right(ChargingSessionModel.fromJson(data));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, ChargingSessionEntity>> getActiveSession(
      String sessionId) async {
    try {
      final response =
          await _client.get(ApiPaths.chargingSessionById(sessionId));
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      return Right(ChargingSessionModel.fromJson(data));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, List<ChargingSessionEntity>>> getSessionHistory({
    int? limit,
    int? offset,
    String? status,
  }) async {
    try {
      final response = await _client.get(
        ApiPaths.chargingHistory,
        // GET /charging/history uses offset-based pagination
        queryParameters: {
          if (limit != null) 'limit': limit,
          if (offset != null) 'offset': offset,
          if (status != null && status != 'ALL') 'status': status.toLowerCase(),
        },
      );
      final raw = response.data;
      final list = raw is List
          ? raw
          : (raw is Map
              ? (raw['items'] as List<dynamic>? ?? raw['data'] as List<dynamic>? ?? [])
              : <dynamic>[]);
      return Right(list
          .map((e) => ChargingSessionModel.fromJson(e as Map<String, dynamic>))
          .toList());
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  void connectTelemetry({
    required String sessionId,
    required void Function(TelemetryData) onData,
  }) {
    final baseUrl = AppConfig.current.wsBaseUrl;

    // Parse WS URL to support both ngrok and local dev
    String connectionUrl;
    String socketPath;

    try {
      final parsed = Uri.parse(baseUrl);
      connectionUrl = '${parsed.scheme}://${parsed.host}${parsed.port != 0 ? ':${parsed.port}' : ''}/charging';
      socketPath = '/socket.io';
    } catch (_) {
      connectionUrl = '$baseUrl/charging';
      socketPath = '/socket.io';
    }

    _socket = io.io(connectionUrl, <String, dynamic>{
      'path': socketPath,
      'transports': ['websocket', 'polling'],
      'reconnectionAttempts': 10,
      'reconnectionDelay': 3000,
    });

    _socket!.onConnect((_) {
      _socket!.emit('join', {'sessionId': sessionId});
    });

    _socket!.on('charging_updated', (dynamic raw) {
      if (raw is! Map) return;
      final json = raw as Map<String, dynamic>;
      final powerKw = (json['powerKw'] as num?)?.toDouble();
      final powerW = powerKw != null ? powerKw * 1000 : 0.0;
      final voltageV = (json['voltageV'] as num?)?.toDouble() ?? 0;
      final currentA = (json['currentA'] as num?)?.toDouble() ?? 0;
      final temperatureC = (json['temperatureC'] as num?)?.toDouble() ?? 0;

      onData(TelemetryData(
        chargerId: json['chargerId']?.toString() ?? '',
        powerW: powerW,
        socPercent: (json['socPercent'] as num?)?.toDouble() ?? 0,
        energyKwh: (json['meterWh'] as num?)?.toDouble() != null
            ? (json['meterWh'] as num).toDouble() / 1000
            : 0,
        voltageV: voltageV,
        currentA: currentA,
        temperatureC: temperatureC,
        amountDue: (json['amountDue'] as num?)?.toDouble() ?? 0,
        timestamp: DateTime.now(),
      ));
    });

    _socket!.onConnectError((_) {});
    _socket!.onDisconnect((_) {});
  }

  @override
  void disconnectTelemetry() {
    _socket?.disconnect();
    _socket = null;
  }
}
