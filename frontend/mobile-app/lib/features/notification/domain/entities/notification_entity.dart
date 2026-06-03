import 'package:equatable/equatable.dart';
import '../../../../core/utils/notification_translator.dart';

/// Notification Alert and Preferences Domain Entity
///
/// Encapsulates notification payloads, dynamic deep-link routing generators,
/// and fine-grained communication mode preferences (Push, SMS, Email, Quiet Hours).
class NotificationEntity extends Equatable {
  final String id;
  final String title;
  final String body;
  final String type; // booking_confirmed | booking_no_show | charging_started | charging_completed | payment_success | arrears_created | idle_fee_started | queue_turn
  final bool isRead;
  final DateTime createdAt;
  final Map<String, String>? data; // deep link params: bookingId, sessionId etc.

  const NotificationEntity({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.data,
  });

  String get translatedTitle => NotificationTranslator.translateTitle(type, title);
  String get translatedBody => NotificationTranslator.translateBody(type, body, data ?? {});

  String? get deepLink {
    switch (type) {
      case 'booking_confirmed':
      case 'booking.confirmed':
      case 'booking_no_show':
      case 'booking.no_show':
      case 'booking.created':
      case 'booking.reminder.upcoming':
      case 'booking.reminder.payment_expiry':
        return '/bookings/${data?['bookingId']}';
      case 'booking.cancelled':
      case 'booking.expired':
        return '/bookings';
      case 'charging_started':
      case 'session.started':
      case 'idle_fee_started':
      case 'billing.idle_fee_charged':
      case 'charger.fault':
      case 'charger_fault':
        return data?['sessionId'] != null
            ? '/charging/session/${data!['sessionId']}'
            : '/charging';
      case 'charging_completed':
      case 'session.completed':
        return data?['sessionId'] != null
            ? '/charging/session/${data!['sessionId']}/summary'
            : '/charging';
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
        return data?['chargerId'] != null
            ? '/bookings/new?chargerId=${data!['chargerId']}'
            : '/bookings';
      case 'charger.queue.ready':
        return data?['chargerId'] != null
            ? '/bookings/new?chargerId=${data!['chargerId']}'
            : '/bookings';
      default:
        return null;
    }
  }

  @override
  List<Object?> get props => [id, isRead, createdAt];
}

class NotificationPreferencesEntity extends Equatable {
  final bool enablePush;
  final bool enableRealtime;
  final bool enableEmail;
  final bool enableSms;
  final String? quietHoursStart; // "22:00"
  final String? quietHoursEnd;   // "07:00"

  const NotificationPreferencesEntity({
    this.enablePush = true,
    this.enableRealtime = true,
    this.enableEmail = true,
    this.enableSms = false,
    this.quietHoursStart,
    this.quietHoursEnd,
  });

  @override
  List<Object?> get props => [enablePush, enableRealtime, enableEmail, enableSms];
}
