import 'package:intl/intl.dart';

/// Formats numerical digits into VND currency localized format (e.g., 150.000 ₫)
class VndFormatter {
  VndFormatter._();

  static final _formatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: '₫',
    decimalDigits: 0,
  );

  /// Formats numerical integer amounts into currency strings
  /// Example: 150000 -> "150.000 ₫"
  static String format(num amount) => _formatter.format(amount);

  /// Formats arbitrary string digits safely into currency strings
  static String formatString(String? amount) {
    final value = double.tryParse(amount ?? '0') ?? 0;
    return format(value);
  }
}
