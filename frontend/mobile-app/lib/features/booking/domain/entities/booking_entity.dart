import 'package:equatable/equatable.dart';

/// Entity đặt lịch — từ BookingStatus enum trong booking.aggregate.ts
class BookingEntity extends Equatable {
  final String id;
  final String chargerId;
  final String stationId;
  final String connectorType;
  final DateTime startTime;
  final DateTime endTime;
  final String status; // PENDING_PAYMENT | CONFIRMED | COMPLETED | CANCELLED | EXPIRED | NO_SHOW
  final double depositAmount;
  final String? qrToken;
  final double? penaltyAmount; // 20% khi NO_SHOW
  final double? refundAmount;  // 80% khi NO_SHOW, 100% khi CANCELLED

  const BookingEntity({
    required this.id,
    required this.chargerId,
    required this.stationId,
    required this.connectorType,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.depositAmount,
    this.qrToken,
    this.penaltyAmount,
    this.refundAmount,
  });

  bool get isConfirmed => status == 'CONFIRMED';
  bool get isPendingPayment => status == 'PENDING_PAYMENT';
  bool get isCancellable =>
      status == 'CONFIRMED' || status == 'PENDING_PAYMENT';

  @override
  List<Object?> get props => [id, status, startTime, endTime];
}

/// Entity slot khả dụng
class AvailabilitySlotEntity extends Equatable {
  final DateTime startTime;
  final DateTime endTime;
  final bool isAvailable;

  const AvailabilitySlotEntity({
    required this.startTime,
    required this.endTime,
    required this.isAvailable,
  });

  @override
  List<Object?> get props => [startTime, isAvailable];
}

/// Entity hàng đợi
class QueuePositionEntity extends Equatable {
  final int position;
  final int estimatedWaitMinutes; // position × 45

  const QueuePositionEntity({
    required this.position,
    required this.estimatedWaitMinutes,
  });

  @override
  List<Object?> get props => [position];
}
