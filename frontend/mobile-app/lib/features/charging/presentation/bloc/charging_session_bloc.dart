import 'dart:async';
import 'package:equatable/equatable.dart';
import 'package:hydrated_bloc/hydrated_bloc.dart';
import '../../domain/entities/charging_session_entity.dart';
import '../../domain/repositories/i_charging_session_repository.dart';

// ── Events ────────────────────────────────────────────────────────────
abstract class ChargingEvent extends Equatable {
  const ChargingEvent();
  @override
  List<Object?> get props => [];
}

class ChargingStartRequested extends ChargingEvent {
  final String bookingId;
  final String qrToken;
  const ChargingStartRequested(
      {required this.bookingId, required this.qrToken});
  @override
  List<Object?> get props => [bookingId, qrToken];
}

class ChargingStopRequested extends ChargingEvent {
  final String sessionId;
  const ChargingStopRequested({required this.sessionId});
  @override
  List<Object?> get props => [sessionId];
}

class ChargingTelemetryReceived extends ChargingEvent {
  final TelemetryData data;
  const ChargingTelemetryReceived({required this.data});
  @override
  List<Object?> get props => [data];
}

class ChargingSessionLoaded extends ChargingEvent {
  final ChargingSessionEntity session;
  const ChargingSessionLoaded({required this.session});
  @override
  List<Object?> get props => [session];
}

class ChargingReset extends ChargingEvent {
  const ChargingReset();
}

// ── States ────────────────────────────────────────────────────────────
abstract class ChargingState extends Equatable {
  const ChargingState();
  @override
  List<Object?> get props => [];
}

class ChargingInitial extends ChargingState {
  const ChargingInitial();
}

class ChargingLoading extends ChargingState {
  const ChargingLoading();
}

class ChargingActive extends ChargingState {
  final ChargingSessionEntity session;
  final TelemetryData? latestTelemetry;

  const ChargingActive({
    required this.session,
    this.latestTelemetry,
  });

  ChargingActive copyWithTelemetry(TelemetryData data) {
    return ChargingActive(
      session: ChargingSessionEntity(
        id: session.id,
        chargerId: session.chargerId,
        status: session.status,
        energyKwh: data.energyKwh,
        socPercent: data.socPercent,
        powerW: data.powerW,
        amountDue: data.amountDue,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        transactionId: session.transactionId,
      ),
      latestTelemetry: data,
    );
  }

  @override
  List<Object?> get props => [session, latestTelemetry];
}

class ChargingCompleted extends ChargingState {
  final ChargingSessionEntity session;
  const ChargingCompleted({required this.session});
  @override
  List<Object?> get props => [session];
}

class ChargingError extends ChargingState {
  final String message;
  const ChargingError({required this.message});
  @override
  List<Object?> get props => [message];
}

// ── BLoC ─────────────────────────────────────────────────────────────
class ChargingSessionBloc
    extends HydratedBloc<ChargingEvent, ChargingState> {
  final IChargingSessionRepository _repository;

  ChargingSessionBloc({required IChargingSessionRepository repository})
      : _repository = repository,
        super(const ChargingInitial()) {
    on<ChargingStartRequested>(_onStart);
    on<ChargingStopRequested>(_onStop);
    on<ChargingTelemetryReceived>(_onTelemetry);
    on<ChargingSessionLoaded>(_onSessionLoaded);
    on<ChargingReset>(_onReset);
  }

  Future<void> _onStart(
      ChargingStartRequested event, Emitter<ChargingState> emit) async {
    emit(const ChargingLoading());
    final result = await _repository.startSession(
      bookingId: event.bookingId,
      qrToken: event.qrToken,
    );
    result.fold(
      (f) => emit(ChargingError(message: f.message)),
      (session) {
        emit(ChargingActive(session: session));
        // Kết nối WebSocket telemetry OCPP
        _repository.connectTelemetry(
          chargerId: session.chargerId,
          onData: (data) => add(ChargingTelemetryReceived(data: data)),
        );
      },
    );
  }

  Future<void> _onStop(
      ChargingStopRequested event, Emitter<ChargingState> emit) async {
    _repository.disconnectTelemetry();
    final result = await _repository.stopSession(event.sessionId);
    result.fold(
      (f) => emit(ChargingError(message: f.message)),
      (session) => emit(ChargingCompleted(session: session)),
    );
  }

  void _onTelemetry(
      ChargingTelemetryReceived event, Emitter<ChargingState> emit) {
    final current = state;
    if (current is ChargingActive) {
      emit(current.copyWithTelemetry(event.data));
    }
  }

  void _onSessionLoaded(
      ChargingSessionLoaded event, Emitter<ChargingState> emit) {
    if (event.session.isActive) {
      emit(ChargingActive(session: event.session));
    } else {
      emit(ChargingCompleted(session: event.session));
    }
  }

  void _onReset(ChargingReset event, Emitter<ChargingState> emit) {
    _repository.disconnectTelemetry();
    emit(const ChargingInitial());
  }

  // ── HydratedBloc serialization ─────────────────────────────────────
  @override
  ChargingState? fromJson(Map<String, dynamic> json) {
    try {
      if (json['type'] == 'active') {
        final s = json['session'] as Map<String, dynamic>;
        final session = ChargingSessionEntity(
          id: s['id'],
          chargerId: s['chargerId'],
          status: s['status'],
          energyKwh: (s['energyKwh'] as num).toDouble(),
          socPercent: (s['socPercent'] as num).toDouble(),
          powerW: (s['powerW'] as num).toDouble(),
          amountDue: (s['amountDue'] as num).toDouble(),
          startedAt: DateTime.parse(s['startedAt']),
          endedAt: s['endedAt'] != null
              ? DateTime.parse(s['endedAt'])
              : null,
          transactionId: s['transactionId'],
        );
        return ChargingActive(session: session);
      }
    } catch (_) {}
    return const ChargingInitial();
  }

  @override
  Map<String, dynamic>? toJson(ChargingState state) {
    if (state is ChargingActive) {
      return {
        'type': 'active',
        'session': {
          'id': state.session.id,
          'chargerId': state.session.chargerId,
          'status': state.session.status,
          'energyKwh': state.session.energyKwh,
          'socPercent': state.session.socPercent,
          'powerW': state.session.powerW,
          'amountDue': state.session.amountDue,
          'startedAt': state.session.startedAt.toIso8601String(),
          'endedAt': state.session.endedAt?.toIso8601String(),
          'transactionId': state.session.transactionId,
        },
      };
    }
    return null;
  }
}
