import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/wallet_entity.dart';
import '../../domain/repositories/i_wallet_repository.dart';

// ── Events ─────────────────────────────────────────────────────────
abstract class WalletEvent extends Equatable {
  const WalletEvent();
  @override
  List<Object?> get props => [];
}

class WalletLoad extends WalletEvent {
  const WalletLoad();
}

class WalletTopUpInitiate extends WalletEvent {
  final double amount;
  const WalletTopUpInitiate({required this.amount});
  @override
  List<Object?> get props => [amount];
}

class WalletLoadTransactions extends WalletEvent {
  final int page;
  const WalletLoadTransactions({this.page = 1});
  @override
  List<Object?> get props => [page];
}

class WalletPayArrears extends WalletEvent {
  const WalletPayArrears();
}

// ── States ─────────────────────────────────────────────────────────
abstract class WalletState extends Equatable {
  const WalletState();
  @override
  List<Object?> get props => [];
}

class WalletInitial extends WalletState {
  const WalletInitial();
}

class WalletLoading extends WalletState {
  const WalletLoading();
}

class WalletLoaded extends WalletState {
  final WalletEntity wallet;
  final List<TransactionEntity> transactions;
  final bool hasMorePages;
  const WalletLoaded({
    required this.wallet,
    required this.transactions,
    this.hasMorePages = false,
  });
  @override
  List<Object?> get props => [wallet, transactions];
}

class WalletTopUpInitiated extends WalletState {
  final String vnpayUrl;
  final String transactionId;
  const WalletTopUpInitiated(
      {required this.vnpayUrl, required this.transactionId});
  @override
  List<Object?> get props => [vnpayUrl, transactionId];
}

class WalletError extends WalletState {
  final String message;
  const WalletError({required this.message});
  @override
  List<Object?> get props => [message];
}

// ── BLoC ───────────────────────────────────────────────────────────
class WalletBloc extends Bloc<WalletEvent, WalletState> {
  final IWalletRepository _repository;

  WalletBloc({required IWalletRepository repository})
      : _repository = repository,
        super(const WalletInitial()) {
    on<WalletLoad>(_onLoad);
    on<WalletTopUpInitiate>(_onTopUp);
    on<WalletLoadTransactions>(_onLoadTransactions);
    on<WalletPayArrears>(_onPayArrears);
  }

  Future<void> _onLoad(
      WalletLoad event, Emitter<WalletState> emit) async {
    emit(const WalletLoading());
    final balanceResult = await _repository.getBalance();
    final txResult =
        await _repository.getTransactions(page: 1, limit: 20);

    balanceResult.fold(
      (f) => emit(WalletError(message: f.message)),
      (wallet) {
        txResult.fold(
          (f) => emit(WalletLoaded(wallet: wallet, transactions: [])),
          (txs) => emit(WalletLoaded(
            wallet: wallet,
            transactions: txs,
            hasMorePages: txs.length == 20,
          )),
        );
      },
    );
  }

  Future<void> _onTopUp(
      WalletTopUpInitiate event, Emitter<WalletState> emit) async {
    emit(const WalletLoading());
    final result = await _repository.topUp(event.amount);
    result.fold(
      (f) => emit(WalletError(message: f.message)),
      (topUp) => emit(WalletTopUpInitiated(
        vnpayUrl: topUp.vnpayUrl,
        transactionId: topUp.transactionId,
      )),
    );
  }

  Future<void> _onLoadTransactions(
      WalletLoadTransactions event, Emitter<WalletState> emit) async {
    final result = await _repository.getTransactions(
        page: event.page, limit: 20);
    result.fold(
      (f) {}, // giữ state
      (txs) {
        final current = state;
        if (current is WalletLoaded) {
          final merged = event.page == 1
              ? txs
              : [...current.transactions, ...txs];
          emit(WalletLoaded(
            wallet: current.wallet,
            transactions: merged,
            hasMorePages: txs.length == 20,
          ));
        }
      },
    );
  }

  Future<void> _onPayArrears(
      WalletPayArrears event, Emitter<WalletState> emit) async {
    emit(const WalletLoading());
    final result = await _repository.payArrears();
    result.fold(
      (f) => emit(WalletError(message: f.message)),
      (_) => add(const WalletLoad()),
    );
  }
}
