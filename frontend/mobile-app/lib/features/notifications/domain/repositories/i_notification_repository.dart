import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/notification_entity.dart';

abstract class INotificationRepository {
  // [63] GET /notifications?limit=20
  Future<Either<Failure, List<NotificationEntity>>> getNotifications({int limit = 20});
  // [64] GET /notifications/unread
  Future<Either<Failure, int>> getUnreadCount();
  // [65] PATCH /notifications/:id/read
  Future<Either<Failure, void>> markRead(String id);
  // [66] PATCH /notifications/read-all
  Future<Either<Failure, void>> markAllRead();
  // [67] POST /devices/register
  Future<Either<Failure, void>> registerDevice(String pushToken);
  // [68] DELETE /devices/:id
  Future<Either<Failure, void>> unregisterDevice(String deviceId);
  // [70] GET /preferences
  Future<Either<Failure, NotificationPreferencesEntity>> getPreferences();
  // [71] PATCH /preferences
  Future<Either<Failure, void>> updatePreferences(NotificationPreferencesEntity prefs);
}
