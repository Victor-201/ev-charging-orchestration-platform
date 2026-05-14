/// Xác thực QR token đặt lịch — từ isQrValidAt() trong booking.aggregate.ts
class QrValidator {
  QrValidator._();

  /// Định dạng: EV-{8 ký tự bookingId}-{16 ký tự hex ngẫu nhiên}
  static final _pattern =
      RegExp(r'^EV-[A-Za-z0-9]{8}-[A-Fa-f0-9]{16}$');

  /// Kiểm tra định dạng QR
  static bool isValidFormat(String qrCode) => _pattern.hasMatch(qrCode);

  /// Kiểm tra cửa sổ thời gian hợp lệ
  /// Hợp lệ: startTime - 15 phút ≤ now ≤ endTime + 5 phút
  static bool isWithinWindow(DateTime startTime, DateTime endTime) {
    final now = DateTime.now();
    final validFrom = startTime.subtract(const Duration(minutes: 15));
    final validUntil = endTime.add(const Duration(minutes: 5));
    return now.isAfter(validFrom) && now.isBefore(validUntil);
  }

  /// Thời gian còn lại đến khi cửa sổ mở
  static Duration? timeUntilWindowOpens(DateTime startTime) {
    final validFrom = startTime.subtract(const Duration(minutes: 15));
    final now = DateTime.now();
    if (now.isBefore(validFrom)) {
      return validFrom.difference(now);
    }
    return null; // Đã mở
  }

  /// Thời gian còn lại đến khi cửa sổ đóng
  static Duration? timeUntilWindowCloses(DateTime endTime) {
    final validUntil = endTime.add(const Duration(minutes: 5));
    final now = DateTime.now();
    if (now.isBefore(validUntil)) {
      return validUntil.difference(now);
    }
    return null; // Đã đóng
  }

  /// Trạng thái cửa sổ QR
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
