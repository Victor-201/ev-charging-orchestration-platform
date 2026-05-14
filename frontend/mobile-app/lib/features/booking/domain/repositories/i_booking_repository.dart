import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/booking_entity.dart';

abstract class IBookingRepository {
  // [39] Khả năng đặt lịch
  Future<Either<Failure, List<AvailabilitySlotEntity>>> getAvailability({
    required String chargerId,
    required DateTime date,
  });

  // [40] Danh sách đặt lịch của tôi
  Future<Either<Failure, List<BookingEntity>>> getMyBookings();

  // [41] Tạo đặt lịch mới
  Future<Either<Failure, BookingEntity>> createBooking({
    required String chargerId,
    required String stationId,
    required String connectorType,
    required DateTime startTime,
    required DateTime endTime,
  });

  // [42] Chi tiết đặt lịch
  Future<Either<Failure, BookingEntity>> getBookingById(String id);

  // [43] Hủy đặt lịch
  Future<Either<Failure, void>> cancelBooking(String id);

  // [44] Tham gia hàng đợi
  Future<Either<Failure, void>> joinQueue(String chargerId);

  // [45] Rời hàng đợi
  Future<Either<Failure, void>> leaveQueue(String chargerId);

  // [46] Vị trí hàng đợi
  Future<Either<Failure, QueuePositionEntity>> getQueuePosition(
      String chargerId);
}
