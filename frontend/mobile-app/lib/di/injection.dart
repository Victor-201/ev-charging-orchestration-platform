import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/network/dio_client.dart';
import '../data/local/secure_storage_service.dart';
import '../data/local/shared_prefs_service.dart';
import '../features/auth/data/repositories/auth_repository_impl.dart';
import '../features/auth/domain/repositories/i_auth_repository.dart';
import '../features/booking/data/repositories/booking_repository_impl.dart';
import '../features/booking/domain/repositories/i_booking_repository.dart';
import '../features/charging/data/repositories/charging_session_repository_impl.dart';
import '../features/charging/domain/repositories/i_charging_session_repository.dart';
import '../features/map/data/repositories/station_repository_impl.dart';
import '../features/map/domain/repositories/i_station_repository.dart';
import '../features/wallet/data/repositories/wallet_repository_impl.dart';
import '../features/wallet/domain/repositories/i_wallet_repository.dart';
import '../features/notifications/data/repositories/notification_repository_impl.dart';
import '../features/notifications/domain/repositories/i_notification_repository.dart';
import '../features/profile/data/repositories/profile_repository_impl.dart';
import '../features/profile/domain/repositories/i_profile_repository.dart';

import '../features/map/presentation/bloc/map_bloc.dart';
import '../features/profile/presentation/bloc/profile_bloc.dart';
import '../features/wallet/presentation/bloc/wallet_bloc.dart';
import '../features/notifications/presentation/bloc/notification_bloc.dart';
import '../features/charging/presentation/bloc/charging_session_bloc.dart';
import '../features/booking/presentation/bloc/booking_bloc.dart';

/// Service locator toàn cục
final getIt = GetIt.instance;

/// Khởi tạo tất cả phụ thuộc
Future<void> configureDependencies() async {
  // ── Lưu trữ ─────────────────────────────────────────────────────────
  const secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
  getIt.registerSingleton<FlutterSecureStorage>(secureStorage);
  getIt.registerSingleton<SecureStorageService>(SecureStorageService(secureStorage));

  final prefs = await SharedPreferences.getInstance();
  getIt.registerSingleton<SharedPrefsService>(SharedPrefsService(prefs));

  // ── Mạng ────────────────────────────────────────────────────────────
  getIt.registerSingleton<DioClient>(
    DioClient(
      secureStorage: secureStorage,
      onLogout: () async {
        // AuthBloc xử lý — tránh circular dependency
      },
    ),
  );

  // ── Repositories ─────────────────────────────────────────────────────
  getIt.registerLazySingleton<IAuthRepository>(() =>
      AuthRepositoryImpl(client: getIt<DioClient>(), storage: getIt<SecureStorageService>()));

  getIt.registerLazySingleton<IStationRepository>(() =>
      StationRepositoryImpl(client: getIt<DioClient>()));

  getIt.registerLazySingleton<IBookingRepository>(() =>
      BookingRepositoryImpl(client: getIt<DioClient>()));

  getIt.registerLazySingleton<IChargingSessionRepository>(() =>
      ChargingSessionRepositoryImpl(client: getIt<DioClient>()));

  getIt.registerLazySingleton<IWalletRepository>(() =>
      WalletRepositoryImpl(client: getIt<DioClient>()));

  getIt.registerLazySingleton<INotificationRepository>(() =>
      NotificationRepositoryImpl(client: getIt<DioClient>()));

  getIt.registerLazySingleton<IProfileRepository>(() =>
      ProfileRepositoryImpl(client: getIt<DioClient>()));

  // ── Blocs ────────────────────────────────────────────────────────────
  getIt.registerFactory<MapBloc>(() => MapBloc(repository: getIt<IStationRepository>()));
  getIt.registerFactory<ProfileBloc>(() => ProfileBloc(repository: getIt<IProfileRepository>()));
  getIt.registerFactory<WalletBloc>(() => WalletBloc(repository: getIt<IWalletRepository>()));
  getIt.registerFactory<NotificationBloc>(() => NotificationBloc(repository: getIt<INotificationRepository>()));
  getIt.registerFactory<ChargingSessionBloc>(() => ChargingSessionBloc(repository: getIt<IChargingSessionRepository>()));
  getIt.registerFactory<BookingBloc>(() => BookingBloc(repository: getIt<IBookingRepository>()));
}
