import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../utils/notification_translator.dart';

final FlutterLocalNotificationsPlugin localNotifications =
    FlutterLocalNotificationsPlugin();

Future<void> initLocalNotifications() async {
  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  const iosSettings = DarwinInitializationSettings(
    requestAlertPermission: true,
    requestBadgePermission: true,
    requestSoundPermission: true,
  );
  const initSettings = InitializationSettings(
    android: androidSettings,
    iOS: iosSettings,
  );

  await localNotifications.initialize(
    initSettings,
    onDidReceiveNotificationResponse: _onNotificationTap,
  );

  const androidChannel = AndroidNotificationChannel(
    'evolt_notifications',
    'EVoltSync',
    description: 'EVoltSync push notifications',
    importance: Importance.high,
    enableVibration: true,
    playSound: true,
  );

  await localNotifications
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(androidChannel);
}

void _onNotificationTap(NotificationResponse response) {
  // Navigation is handled by FcmRouteHandler via onMessageOpenedApp
}

Future<void> showTranslatedNotification({
  required int id,
  required String type,
  required String rawTitle,
  required String rawBody,
  required Map<String, dynamic> data,
}) async {
  final title = NotificationTranslator.translateTitle(type, rawTitle);
  final body = NotificationTranslator.translateBody(type, rawBody, data);

  const androidDetails = AndroidNotificationDetails(
    'evolt_notifications',
    'EVoltSync',
    channelDescription: 'EVoltSync push notifications',
    importance: Importance.high,
    priority: Priority.high,
    showWhen: true,
    enableVibration: true,
    playSound: true,
  );
  const iosDetails = DarwinNotificationDetails(
    presentAlert: true,
    presentBadge: true,
    presentSound: true,
  );
  const details = NotificationDetails(
    android: androidDetails,
    iOS: iosDetails,
  );

  await localNotifications.show(id, title, body, details,
      payload: data.toString());
}
