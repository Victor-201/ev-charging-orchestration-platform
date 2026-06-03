import 'dart:async';
import 'dart:ui';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../design_system/theme/app_colors.dart';
import '../design_system/theme/app_typography.dart';
import '../utils/notification_translator.dart';
import 'local_notification_service.dart';

/// Handles navigation redirects upon receiving real-time FCM signals
class FcmRouteHandler {
  static int _notifId = 0;

  /// Must be a top-level or static function for background isolate entry.
  @pragma('vm:entry-point')
  static Future<void> backgroundHandler(RemoteMessage message) async {
    final data = Map<String, dynamic>.from(message.data);
    final type = data['type'] as String? ?? '';
    final rawTitle = data['title'] as String? ?? '';
    final rawBody = data['body'] as String? ?? '';
    if (rawTitle.isEmpty && rawBody.isEmpty) return;

    _notifId++;
    await showTranslatedNotification(
      id: _notifId,
      type: type,
      rawTitle: rawTitle,
      rawBody: rawBody,
      data: data,
    );
  }

  static void setupForegroundHandler(GlobalKey<NavigatorState> navigatorKey) {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final data = Map<String, dynamic>.from(message.data);
      final rawTitle = data['title'] as String? ?? '';
      final rawBody = data['body'] as String? ?? '';
      if (rawTitle.isEmpty && rawBody.isEmpty) return;

      final type = data['type'] as String? ?? '';
      final title = NotificationTranslator.translateTitle(type, rawTitle);
      final body = NotificationTranslator.translateBody(type, rawBody, data);

      final context = navigatorKey.currentContext;
      if (context == null || !context.mounted) return;

      late OverlayEntry entry;
      entry = OverlayEntry(
        builder: (_) => InAppNotificationBanner(
          title: title,
          body: body,
          onTap: () {
            _handleNavigation(data, navigatorKey);
          },
          onDismiss: () {
            entry.remove();
          },
        ),
      );

      Overlay.of(context).insert(entry);
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('[FCM] Opened: ${message.data}');
      _handleNavigation(message.data, navigatorKey);
    });
  }

  static void _handleNavigation(
      Map<String, dynamic> data, GlobalKey<NavigatorState> navigatorKey) {
    final context = navigatorKey.currentContext;
    if (context == null || !context.mounted) return;

    final route = _getRouteFromPayload(data);
    if (route != null) {
      GoRouter.of(context).push(route);
    }
  }

  static String? _getRouteFromPayload(Map<String, dynamic> data) {
    final type = data['type'] as String?;
    switch (type) {
      case 'booking.created':
      case 'booking_confirmed':
      case 'booking.confirmed':
      case 'booking_no_show':
      case 'booking.no_show':
      case 'booking.reminder.upcoming':
      case 'booking.reminder.payment_expiry':
        if (data['bookingId'] != null) {
          return '/bookings/${data['bookingId']}';
        }
        return '/bookings';
      case 'booking.expired':
      case 'booking.cancelled':
        return '/bookings';
      case 'session.telemetry_push':
      case 'session.telemetry':
      case 'charging_started':
      case 'session.started':
      case 'idle_fee_started':
      case 'billing.idle_fee_charged':
      case 'charger.fault':
      case 'charger_fault':
        if (data['sessionId'] != null) {
          return '/charging/session/${data['sessionId']}';
        }
        return '/charging';
      case 'charging_completed':
      case 'session.completed':
        if (data['sessionId'] != null) {
          return '/charging/session/${data['sessionId']}/summary';
        }
        return '/charging';
      case 'payment_success':
      case 'payment.completed':
      case 'payment.failed':
      case 'billing.extra_charge':
      case 'billing.refund_issued':
        return '/wallet';
      case 'arrears_created':
      case 'wallet.arrears.created':
        return '/profile/arrears';
      case 'wallet.arrears.cleared':
        return '/wallet';
      case 'queue_turn':
      case 'queue.updated':
        if (data['chargerId'] != null) {
          return '/bookings/new?chargerId=${data['chargerId']}';
        }
        return '/bookings';
      case 'charger.queue.ready':
        if (data['chargerId'] != null) {
          return '/bookings/new?chargerId=${data['chargerId']}';
        }
        return '/bookings/queue/${data['chargerId']}';
      default:
        // Try fallback 'route' field if exists
        return data['route'] as String?;
    }
  }
}

/// A high-end sliding floating banner widget with glassmorphism (obsidian blur) styling
class InAppNotificationBanner extends StatefulWidget {
  final String title;
  final String body;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  const InAppNotificationBanner({
    super.key,
    required this.title,
    required this.body,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  State<InAppNotificationBanner> createState() => _InAppNotificationBannerState();
}

class _InAppNotificationBannerState extends State<InAppNotificationBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1.5),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.elasticOut,
    ));

    _scaleAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.5, curve: Curves.easeOutBack)),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.3, curve: Curves.easeIn)),
    );

    _controller.forward();

    _dismissTimer = Timer(const Duration(seconds: 5), _dismiss);
  }

  void _dismiss() {
    if (!mounted) return;
    _controller.reverse().then((_) {
      if (mounted) widget.onDismiss();
    });
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final topPadding = mediaQuery.padding.top + 8.0;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Positioned(
      top: topPadding,
      left: 16.0,
      right: 16.0,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: GestureDetector(
              onTap: () {
                _dismissTimer?.cancel();
                _dismiss();
                widget.onTap();
              },
              onVerticalDragEnd: (details) {
                if (details.primaryVelocity != null && details.primaryVelocity! < -300) {
                  _dismissTimer?.cancel();
                  _dismiss();
                }
              },
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20.0),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 24.0, sigmaY: 24.0),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.glassBgDark
                          : AppColors.glassBgLight,
                      borderRadius: BorderRadius.circular(20.0),
                      border: Border.all(
                        color: isDark
                            ? AppColors.glassBorderDark
                            : AppColors.glassBorderLight,
                        width: 1.0,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          blurRadius: 24.0,
                          offset: const Offset(0, 8),
                        ),
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 40.0,
                          offset: const Offset(0, 12),
                        ),
                      ],
                    ),
                    child: IntrinsicHeight(
                      child: Row(
                        children: [
                          Container(
                            width: 5.0,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [AppColors.cyan, AppColors.lime],
                              ),
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(20.0),
                                bottomLeft: Radius.circular(20.0),
                              ),
                            ),
                          ),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 14.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      gradient: const LinearGradient(
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                        colors: [AppColors.cyan, AppColors.lime],
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppColors.cyan.withValues(alpha: 0.3),
                                          blurRadius: 8.0,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: const Icon(
                                      Icons.bolt_rounded,
                                      color: Colors.white,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12.0),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          widget.title,
                                          style: AppTypography.bodyMd.copyWith(
                                            fontWeight: FontWeight.w700,
                                            color: isDark ? AppColors.textLight : AppColors.textDark,
                                            letterSpacing: 0.1,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          widget.body,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: AppTypography.caption.copyWith(
                                            color: isDark
                                                ? AppColors.textLight.withValues(alpha: 0.8)
                                                : AppColors.textDark.withValues(alpha: 0.7),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(top: 12.0, right: 12.0),
                            child: GestureDetector(
                              onTap: () {
                                _dismissTimer?.cancel();
                                _dismiss();
                              },
                              child: Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? Colors.white.withValues(alpha: 0.1)
                                      : Colors.black.withValues(alpha: 0.05),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.close_rounded,
                                  size: 14,
                                  color: isDark
                                      ? AppColors.textLight.withValues(alpha: 0.5)
                                      : AppColors.textDark.withValues(alpha: 0.4),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
