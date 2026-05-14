import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import '../../domain/entities/wallet_entity.dart';
import '../../domain/repositories/i_wallet_repository.dart';
import '../../../../core/constants/api_paths.dart';
import '../../../../core/errors/error_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/dio_client.dart';

class WalletRepositoryImpl implements IWalletRepository {
  final DioClient _client;

  WalletRepositoryImpl({required DioClient client}) : _client = client;

  @override
  Future<Either<Failure, WalletEntity>> getBalance() async {
    try {
      final response = await _client.get(ApiPaths.walletBalance);
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      return Right(WalletEntity(
        id: data['id']?.toString() ?? '',
        balance: (data['balance'] as num?)?.toDouble() ?? 0,
        hasArrears: data['hasArrears'] == true,
        arrearsAmount: (data['arrearsAmount'] as num?)?.toDouble(),
      ));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, TopUpResultEntity>> topUp(double amount) async {
    try {
      final response = await _client.post(
        ApiPaths.walletTopup,
        data: {
          'amount': amount,
          'returnUrl': 'ev://app/wallet/topup/processing',
        },
        withIdempotency: true,
      );
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      return Right(TopUpResultEntity(
        transactionId: data['transactionId']?.toString() ?? '',
        vnpayUrl: data['vnpayUrl']?.toString() ?? '',
        status: data['status']?.toString() ?? 'PENDING',
      ));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, TransactionEntity>> walletPay(
      String transactionId) async {
    try {
      final response = await _client.post(
        ApiPaths.walletPay,
        data: {'transactionId': transactionId},
        withIdempotency: true,
      );
      final data = response.data['data'] as Map<String, dynamic>? ?? {};
      return Right(_parseTransaction(data));
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, List<TransactionEntity>>> getTransactions({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _client.get(
        ApiPaths.transactions,
        queryParameters: {'page': page, 'limit': limit},
      );
      final list = response.data['data'] as List<dynamic>? ?? [];
      return Right(list
          .map((e) => _parseTransaction(e as Map<String, dynamic>))
          .toList());
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  @override
  Future<Either<Failure, void>> payArrears() async {
    try {
      await _client.post(ApiPaths.walletPay,
          data: {'payArrears': true}, withIdempotency: true);
      return const Right(null);
    } on DioException catch (e) {
      return Left(ErrorMapper.fromDioException(e));
    }
  }

  TransactionEntity _parseTransaction(Map<String, dynamic> data) {
    return TransactionEntity(
      id: data['id']?.toString() ?? '',
      type: data['type']?.toString() ?? 'PAYMENT',
      amount: (data['amount'] as num?)?.toDouble() ?? 0,
      status: data['status']?.toString() ?? 'PENDING',
      createdAt: data['createdAt'] != null
          ? DateTime.parse(data['createdAt'].toString())
          : DateTime.now(),
      description: data['description']?.toString(),
      sessionId: data['sessionId']?.toString(),
    );
  }
}
