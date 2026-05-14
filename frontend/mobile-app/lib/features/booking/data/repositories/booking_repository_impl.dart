import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import '../../domain/entities/booking_entity.dart';
import '../../domain/repositories/i_booking_repository.dart';
import '../../../../core/constants/api_paths.dart';
import '../../../../core/errors/error_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/dio_client.dart';

class BookingModel extends BookingEntity {
  const BookingModel({
    required super.id,
    required super.chargerId,
    required super.stationId,
    required super.connectorType,
    required super.startTime,
    required super.endTime,
    required super.status,
    required super.depositAmount,
    super.qrToken,
    super.penaltyAmount,
    super.refundAmount,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id']?.toString() ?? '',
      chargerId: json['chargerId']?.toString() ?? '',
      stationId: json['stationId']?.toString() ?? '',
      connectorType: json['connectorType']?.toString() ?? '',
      startTime: DateTime.parse(json['startTime'].toString()),
      endTime: DateTime.parse(json['endTime'].toString()),
      status: json['status']?.toString() ?? 'PENDING_PAYMENT',
      depositAmount: (json['depositAmount'] as num?)?.toDouble() ?? 0,
      qrToken: json['qrToken']?.toString(),
      penaltyAmount: (json['penaltyAmount'] as num?)?.toDouble(),
      refundAmount: (json['refundAmount'] as num?)?.toDouble(),
    );
  }
}

class BookingRepositoryImpl implements IBookingRepository {
  final DioClient _client;

  BookingRepositoryImpl({required DioClient client}) : _client = client;

  @override
  Future<Either<Failure, List<AvailabilitySlotEntity>>> getAvailability({
    required String chargerId,
    required DateTime date,
  }) async {
    try {
      final response = await _client.get(
        ApiPaths.bookingAvailability,
        queryParameters: {
          'chargerId': chargerId,
          'date': date.toIso8601String().split('T')[0],
        },
      );
      final list = response.data['data'] as List<dynamic>? ?? [];
      return Right(list.map((s) {
        final m = s as Map<String, dynamic>;
        return AvailabilitySlotEntity(
          startTime: DateTime.parse(m['startTime'].toString()),
          endTime: DateTime.parse(m['endTime'].toString()),
          isAvailable: m['isAvailable'] == true,
        );
      }).toList());
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, List<BookingEntity>>> getMyBookings() async {
    try {
      final response = await _client.get(ApiPaths.myBookings);
      final list = response.data['data'] as List<dynamic>? ?? [];
      return Right(list
          .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
          .toList());
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, BookingEntity>> createBooking({
    required String chargerId,
    required String stationId,
    required String connectorType,
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    try {
      final response = await _client.post(
        ApiPaths.bookings,
        data: {
          'chargerId': chargerId,
          'stationId': stationId,
          'connectorType': connectorType,
          'startTime': startTime.toIso8601String(),
          'endTime': endTime.toIso8601String(),
        },
        withIdempotency: true,
      );
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      return Right(BookingModel.fromJson(data));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, BookingEntity>> getBookingById(String id) async {
    try {
      final response = await _client.get(ApiPaths.bookingById(id));
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      return Right(BookingModel.fromJson(data));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, void>> cancelBooking(String id) async {
    try {
      await _client.delete(ApiPaths.bookingById(id));
      return const Right(null);
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, void>> joinQueue(String chargerId) async {
    try {
      await _client.post(ApiPaths.queue,
          data: {'chargerId': chargerId}, withIdempotency: true);
      return const Right(null);
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, void>> leaveQueue(String chargerId) async {
    try {
      await _client.delete(ApiPaths.leaveQueue(chargerId));
      return const Right(null);
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, QueuePositionEntity>> getQueuePosition(
      String chargerId) async {
    try {
      final response =
          await _client.get(ApiPaths.queuePosition(chargerId));
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      final position = (data['position'] as num?)?.toInt() ?? 0;
      return Right(QueuePositionEntity(
        position: position,
        estimatedWaitMinutes: position * 45, // Backend logic: position × 45
      ));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }
}
