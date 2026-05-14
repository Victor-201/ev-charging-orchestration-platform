import 'package:intl/intl.dart';

/// Định dạng số tiền VNĐ — ví dụ: 150.000 ₫
class VndFormatter {
  VndFormatter._();

  static final _formatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: '₫',
    decimalDigits: 0,
  );

  /// Định dạng số nguyên thành chuỗi VNĐ
  /// Ví dụ: 150000 → "150.000 ₫"
  static String format(num amount) => _formatter.format(amount);

  /// Định dạng chuỗi số thành VNĐ (an toàn)
  static String formatString(String? amount) {
    final value = double.tryParse(amount ?? '0') ?? 0;
    return format(value);
  }
}
