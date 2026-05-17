/// Validates QR codes against ocpp dynamic timing bounds
class QrValidator {
  QrValidator._();

  /// Format expectation: EV-{8-char bookingId}-{16-char random hex}
  static final _pattern =
      RegExp(r'^EV-[A-Za-z0-9]{8}-[A-Fa-f0-9]{16}$');

  /// Validates string token conforms to correct EV prefix format
  static bool isValidFormat(String qrCode) => _pattern.hasMatch(qrCode);

  /// Validates request lands inside reservation activation limits
  /// Valid range: startTime - 15 minutes to endTime + 5 minutes
  static bool isWithinWindow(DateTime startTime, DateTime endTime) {
    final now = DateTime.now();
    final validFrom = startTime.subtract(const Duration(minutes: 15));
    final validUntil = endTime.add(const Duration(minutes: 5));
    return now.isAfter(validFrom) && now.isBefore(validUntil);
  }

  /// Time remaining until the activation window opens
  static Duration? timeUntilWindowOpens(DateTime startTime) {
    final validFrom = startTime.subtract(const Duration(minutes: 15));
    final now = DateTime.now();
    if (now.isBefore(validFrom)) {
      return validFrom.difference(now);
    }
    return null; // Active
  }

  /// Time remaining until the activation window closes
  static Duration? timeUntilWindowCloses(DateTime endTime) {
    final validUntil = endTime.add(const Duration(minutes: 5));
    final now = DateTime.now();
    if (now.isBefore(validUntil)) {
      return validUntil.difference(now);
    }
    return null; // Expired
  }

  /// Evaluates current activation window state
  static QrWindowStatus windowStatus(
      DateTime startTime, DateTime endTime) {
    final now = DateTime.now();
    final validFrom = startTime.subtract(const Duration(minutes: 15));
    final validUntil = endTime.add(const Duration(minutes: 5));

    if (now.isBefore(validFrom)) return QrWindowStatus.notYetValid;
    if (now.isAfter(validUntil)) return QrWindowStatus.expired;
    return QrWindowStatus.valid;
  }
}

enum QrWindowStatus { notYetValid, valid, expired }
