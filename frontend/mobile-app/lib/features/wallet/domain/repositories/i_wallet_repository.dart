import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/wallet_entity.dart';

abstract class IWalletRepository {
  // [60] Số dư ví
  Future<Either<Failure, WalletEntity>> getBalance();

  // [61] Nạp tiền VNPay
  Future<Either<Failure, TopUpResultEntity>> topUp(double amount);

  // [62] Thanh toán bằng ví
  Future<Either<Failure, TransactionEntity>> walletPay(String transactionId);

  // [63] Lịch sử giao dịch
  Future<Either<Failure, List<TransactionEntity>>> getTransactions({
    int page = 1,
    int limit = 20,
  });

  // [68] Thanh toán nợ tồn đọng
  Future<Either<Failure, void>> payArrears();
}
