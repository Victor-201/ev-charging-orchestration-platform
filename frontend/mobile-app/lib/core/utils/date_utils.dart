import 'package:intl/intl.dart';

/// Tiện ích xử lý ngày giờ — dùng cho toàn bộ ứng dụng
class DateUtils {
  DateUtils._();

  static final _dateFormat     = DateFormat('dd/MM/yyyy', 'vi_VN');
  static final _timeFormat     = DateFormat('HH:mm', 'vi_VN');
  static final _dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm', 'vi_VN');

  static String formatDate(DateTime dt)     => _dateFormat.format(dt);
  static String formatTime(DateTime dt)     => _timeFormat.format(dt);
  static String formatDateTime(DateTime dt) => _dateTimeFormat.format(dt);

  /// HH:mm — alias ngắn gọn cho slot grid
  static String formatTimeHm(DateTime dt) => _timeFormat.format(dt);

  /// Kiểm tra hai DateTime có cùng ngày không
  static bool isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  /// Kiểm tra độ tuổi tối thiểu 18 (từ dateOfBirth)
  static bool isAtLeast18(DateTime dateOfBirth) {
    final now = DateTime.now();
    final age = now.year - dateOfBirth.year;
    if (age > 18) return true;
    if (age == 18) {
      if (now.month > dateOfBirth.month) return true;
      if (now.month == dateOfBirth.month && now.day >= dateOfBirth.day) return true;
    }
    return false;
  }

  /// Đếm ngược dạng HH:MM:SS
  static String formatCountdown(Duration duration) {
    final hours   = duration.inHours.toString().padLeft(2, '0');
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  /// Đếm ngược dạng MM:SS
  static String formatCountdownMinSec(Duration duration) {
    final minutes = duration.inMinutes.toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  /// Hiển thị tương đối — "vừa xong", "3 phút trước", "2 giờ trước", "hôm qua"
  static String formatRelative(DateTime dt) {
    final now  = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inSeconds < 60) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24)   return '${diff.inHours} giờ trước';
    if (diff.inDays == 1)    return 'Hôm qua';
    if (diff.inDays < 7)     return '${diff.inDays} ngày trước';
    return formatDate(dt);
  }
}
