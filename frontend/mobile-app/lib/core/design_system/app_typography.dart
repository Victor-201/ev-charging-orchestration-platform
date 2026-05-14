import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Typography hệ thống — Be Vietnam Pro (Google Fonts) §3.2
/// Font stack: Be Vietnam Pro → Roboto → sans-serif
abstract class AppTypography {
  static TextTheme get textTheme => TextTheme(
        // displayLg — 32sp / Bold — Hiển thị chi phí phiên sạc VNĐ
        displayLarge: _beVietnamPro(
          fontSize: 32,
          fontWeight: FontWeight.w700,
        ),
        // displayMd — 24sp / Bold — Số dư ví
        displayMedium: _beVietnamPro(
          fontSize: 24,
          fontWeight: FontWeight.w700,
        ),
        // headingLg — 20sp / SemiBold — Tiêu đề AppBar, header màn hình
        headlineLarge: _beVietnamPro(
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
        // headingMd — 17sp / SemiBold — Tiêu đề card, header section
        headlineMedium: _beVietnamPro(
          fontSize: 17,
          fontWeight: FontWeight.w600,
        ),
        // bodyLg — 16sp / Regular — Nội dung, trường nhập
        bodyLarge: _beVietnamPro(
          fontSize: 16,
          fontWeight: FontWeight.w400,
        ),
        // bodyMd — 14sp / Regular — Văn bản phụ, phụ đề
        bodyMedium: _beVietnamPro(
          fontSize: 14,
          fontWeight: FontWeight.w400,
        ),
        // bodySmall — 12sp / Regular — Dấu thời gian, metadata
        bodySmall: _beVietnamPro(
          fontSize: 12,
          fontWeight: FontWeight.w400,
        ),
        // labelLarge — 11sp / Medium — Chip trạng thái (CAPS)
        labelLarge: _beVietnamPro(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.8,
        ),
      );

  static TextStyle _beVietnamPro({
    required double fontSize,
    required FontWeight fontWeight,
    double? letterSpacing,
    Color? color,
  }) {
    return GoogleFonts.beVietnamPro(
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      color: color,
    );
  }

  // ── Token tiện ích ─────────────────────────────────────────
  static TextStyle get displayLg => _beVietnamPro(
        fontSize: 32,
        fontWeight: FontWeight.w700,
      );

  static TextStyle get displayMd => _beVietnamPro(
        fontSize: 24,
        fontWeight: FontWeight.w700,
      );

  static TextStyle get headingLg => _beVietnamPro(
        fontSize: 20,
        fontWeight: FontWeight.w600,
      );

  static TextStyle get headingMd => _beVietnamPro(
        fontSize: 17,
        fontWeight: FontWeight.w600,
      );

  static TextStyle get bodyLg => _beVietnamPro(
        fontSize: 16,
        fontWeight: FontWeight.w400,
      );

  static TextStyle get bodyMd => _beVietnamPro(
        fontSize: 14,
        fontWeight: FontWeight.w400,
      );

  static TextStyle get caption => _beVietnamPro(
        fontSize: 12,
        fontWeight: FontWeight.w400,
      );

  static TextStyle get overline => _beVietnamPro(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.8,
      );

  static TextStyle get labelMd => _beVietnamPro(
        fontSize: 13,
        fontWeight: FontWeight.w500,
      );

  static TextStyle get labelSm => _beVietnamPro(
        fontSize: 11,
        fontWeight: FontWeight.w500,
      );
}
