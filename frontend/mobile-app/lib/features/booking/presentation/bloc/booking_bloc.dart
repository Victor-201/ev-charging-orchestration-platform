import 'dart:async';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/booking_entity.dart';
import '../../domain/repositories/i_booking_repository.dart';

// ── Events ────────────────────────────────────────────────────────────
abstract class BookingEvent extends Equatable {
  const BookingEvent();
  @override
  List<Object?> get props => [];
}

class BookingLoadHistory extends BookingEvent {
  const BookingLoadHistory();
}

class BookingLoadAvailability extends BookingEvent {
  final String chargerId;
  final DateTime date;
  const BookingLoadAvailability(
      {required this.chargerId, required this.date});
  @override
  List<Object?> get props => [chargerId, date];
}

class BookingCreate extends BookingEvent {
  final String chargerId;
  final String stationId;
  final String connectorType;
  final DateTime startTime;
  final DateTime endTime;
  const BookingCreate({
    required this.chargerId,
    required this.stationId,
    required this.connectorType,
    required this.startTime,
    required this.endTime,
  });
  @override
  List<Object?> get props =>
      [chargerId, stationId, connectorType, startTime, endTime];
}

class BookingLoadDetail extends BookingEvent {
  final String id;
  const BookingLoadDetail({required this.id});
  @override
  List<Object?> get props => [id];
}

class BookingCancel extends BookingEvent {
  final String id;
  const BookingCancel({required this.id});
  @override
  List<Object?> get props => [id];
}

class BookingStartPolling extends BookingEvent {
  final String id;
  const BookingStartPolling({required this.id});
  @override
  List<Object?> get props => [id];
}

class BookingStopPolling extends BookingEvent {
  const BookingStopPolling();
}

// Queue events
class QueueJoin extends BookingEvent {
  final String chargerId;
  const QueueJoin({required this.chargerId});
  @override
  List<Object?> get props => [chargerId];
}

class QueueLeave extends BookingEvent {
  final String chargerId;
  const QueueLeave({required this.chargerId});
  @override
  List<Object?> get props => [chargerId];
}

class QueueLoadPosition extends BookingEvent {
  final String chargerId;
  const QueueLoadPosition({required this.chargerId});
  @override
  List<Object?> get props => [chargerId];
}

// ── States ────────────────────────────────────────────────────────────
abstract class BookingState extends Equatable {
  const BookingState();
  @override
  List<Object?> get props => [];
}

class BookingInitial extends BookingState {
  const BookingInitial();
}

class BookingLoading extends BookingState {
  const BookingLoading();
}

class BookingHistoryLoaded extends BookingState {
  final List<BookingEntity> bookings;
  const BookingHistoryLoaded({required this.bookings});
  @override
  List<Object?> get props => [bookings];
}

class BookingAvailabilityLoaded extends BookingState {
  final List<AvailabilitySlotEntity> slots;
  final String chargerId;
  const BookingAvailabilityLoaded(
      {required this.slots, required this.chargerId});
  @override
  List<Object?> get props => [slots, chargerId];
}

class BookingDetailLoaded extends BookingState {
  final BookingEntity booking;
  const BookingDetailLoaded({required this.booking});
  @override
  List<Object?> get props => [booking];
}

class BookingCreated extends BookingState {
  final BookingEntity booking;
  const BookingCreated({required this.booking});
  @override
  List<Object?> get props => [booking];
}

class BookingCancelled extends BookingState {
  const BookingCancelled();
}

class QueueState extends BookingState {
  final int? position;
  final int? estimatedWaitMinutes;
  final bool inQueue;
  final bool isLoading;
  const QueueState({
    this.position,
    this.estimatedWaitMinutes,
    this.inQueue = false,
    this.isLoading = false,
  });
  @override
  List<Object?> get props =>
      [position, estimatedWaitMinutes, inQueue, isLoading];
}

class BookingError extends BookingState {
  final String message;
  const BookingError({required this.message});
  @override
  List<Object?> get props => [message];
}

// ── BLoC ─────────────────────────────────────────────────────────────
class BookingBloc extends Bloc<BookingEvent, BookingState> {
  final IBookingRepository _repository;
  Timer? _pollTimer;
  Timer? _queuePollTimer;

  BookingBloc({required IBookingRepository repository})
      : _repository = repository,
        super(const BookingInitial()) {
    on<BookingLoadHistory>(_onLoadHistory);
    on<BookingLoadAvailability>(_onLoadAvailability);
    on<BookingCreate>(_onCreate);
    on<BookingLoadDetail>(_onLoadDetail);
    on<BookingCancel>(_onCancel);
    on<BookingStartPolling>(_onStartPolling);
    on<BookingStopPolling>(_onStopPolling);
    on<QueueJoin>(_onQueueJoin);
    on<QueueLeave>(_onQueueLeave);
    on<QueueLoadPosition>(_onQueueLoadPosition);
  }

  Future<void> _onLoadHistory(
      BookingLoadHistory event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    final result = await _repository.getMyBookings();
    result.fold(
      (f) => emit(BookingError(message: f.message)),
      (list) => emit(BookingHistoryLoaded(bookings: list)),
    );
  }

  Future<void> _onLoadAvailability(
      BookingLoadAvailability event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    final result = await _repository.getAvailability(
      chargerId: event.chargerId,
      date: event.date,
    );
    result.fold(
      (f) => emit(BookingError(message: f.message)),
      (slots) => emit(BookingAvailabilityLoaded(
          slots: slots, chargerId: event.chargerId)),
    );
  }

  Future<void> _onCreate(
      BookingCreate event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    final result = await _repository.createBooking(
      chargerId: event.chargerId,
      stationId: event.stationId,
      connectorType: event.connectorType,
      startTime: event.startTime,
      endTime: event.endTime,
    );
    result.fold(
      (f) => emit(BookingError(message: f.message)),
      (booking) => emit(BookingCreated(booking: booking)),
    );
  }

  Future<void> _onLoadDetail(
      BookingLoadDetail event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    final result = await _repository.getBookingById(event.id);
    result.fold(
      (f) => emit(BookingError(message: f.message)),
      (booking) => emit(BookingDetailLoaded(booking: booking)),
    );
  }

  Future<void> _onCancel(
      BookingCancel event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    final result = await _repository.cancelBooking(event.id);
    result.fold(
      (f) => emit(BookingError(message: f.message)),
      (_) => emit(const BookingCancelled()),
    );
  }

  /// Poll [42] GET /bookings/:id mỗi 3 giây đến khi CONFIRMED
  void _onStartPolling(
      BookingStartPolling event, Emitter<BookingState> emit) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      add(BookingLoadDetail(id: event.id));
    });
  }

  void _onStopPolling(
      BookingStopPolling event, Emitter<BookingState> emit) {
    _pollTimer?.cancel();
  }

  Future<void> _onQueueJoin(
      QueueJoin event, Emitter<BookingState> emit) async {
    emit(const QueueState(inQueue: false, isLoading: true));
    final result = await _repository.joinQueue(event.chargerId);
    result.fold(
      (f) => emit(BookingError(message: f.message)),
      (_) {
        emit(const QueueState(inQueue: true, position: 0));
        // Bắt đầu poll vị trí hàng đợi mỗi 30 giây
        _queuePollTimer?.cancel();
        _queuePollTimer = Timer.periodic(
          const Duration(seconds: 30),
          (_) => add(QueueLoadPosition(chargerId: event.chargerId)),
        );
      },
    );
  }

  Future<void> _onQueueLeave(
      QueueLeave event, Emitter<BookingState> emit) async {
    _queuePollTimer?.cancel();
    await _repository.leaveQueue(event.chargerId);
    emit(const QueueState(inQueue: false));
  }

  Future<void> _onQueueLoadPosition(
      QueueLoadPosition event, Emitter<BookingState> emit) async {
    final result =
        await _repository.getQueuePosition(event.chargerId);
    result.fold(
      (f) {}, // giữ nguyên state
      (pos) => emit(QueueState(
        inQueue: true,
        position: pos.position,
        estimatedWaitMinutes: pos.estimatedWaitMinutes,
      )),
    );
  }

  @override
  Future<void> close() {
    _pollTimer?.cancel();
    _queuePollTimer?.cancel();
    return super.close();
  }
}
