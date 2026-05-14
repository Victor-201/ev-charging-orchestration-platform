import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

/// Handler điều hướng khi nhận FCM notification khi app đang chạy/background
class FcmRouteHandler {
  static void setupForegroundHandler(GlobalKey<NavigatorState> navigatorKey) {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('[FCM] Foreground: ${message.notification?.title}');
      // TODO: Hiển thị in-app notification banner
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('[FCM] Opened: ${message.data}');
      _handleNavigation(message.data, navigatorKey);
    });
  }

  static void _handleNavigation(
      Map<String, dynamic> data, GlobalKey<NavigatorState> navigatorKey) {
    final route = data['route'] as String?;
    if (route != null && navigatorKey.currentContext != null) {
      Navigator.of(navigatorKey.currentContext!).pushNamed(route);
    }
  }
}
