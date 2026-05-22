import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/design_system/theme/app_colors.dart';
import '../../../../core/design_system/theme/app_typography.dart';
import '../../../../core/design_system/widgets/ev_button.dart';
import '../../../../core/design_system/widgets/liquid_glass_card.dart';
import '../../../../core/design_system/widgets/liquid_glass_scaffold.dart';

/// Application Welcome Portal Screen
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return LiquidGlassScaffold(
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: LiquidGlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Logo
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      gradient: AppColors.cyanLimeGradient,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.cyan.withValues(alpha: 0.4),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.electric_bolt,
                      color: Colors.white,
                      size: 34,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Headline
                  Text(
                    'EVoltSync',
                    style: AppTypography.displayLg.copyWith(
                      color: isDark ? AppColors.textLight : AppColors.textDark,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Nền tảng điều phối sạc xe điện\nthông minh tại Việt Nam 🇻🇳',
                    style: AppTypography.bodyLg.copyWith(
                      color: AppColors.textMuted,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Feature chips
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      _FeatureChip(icon: Icons.bolt, label: 'Sạc nhanh'),
                      _FeatureChip(icon: Icons.map_outlined, label: 'Tìm trạm'),
                      _FeatureChip(icon: Icons.account_balance_wallet_outlined, label: 'Ví điện tử'),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // CTA Buttons
                  EVButton(
                    label: 'Đăng nhập',
                    onPressed: () => context.go('/auth/login'),
                    icon: Icons.login_rounded,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  EVButton(
                    label: 'Tạo tài khoản',
                    onPressed: () => context.go('/auth/register'),
                    variant: EVButtonVariant.outlined,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Center(
                    child: TextButton(
                      onPressed: () => context.go('/map'),
                      child: Text(
                        'Khám phá bản đồ →',
                        style: AppTypography.bodyMd.copyWith(
                          color: AppColors.cyan,
                          fontWeight: FontWeight.w600,
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
    );
  }
}

class _FeatureChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeatureChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.cyan.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(
          color: AppColors.cyan.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.cyan, size: 14),
          const SizedBox(width: AppSpacing.xs),
          Text(
            label,
            style: AppTypography.labelSm.copyWith(
              color: isDark ? AppColors.textLight : AppColors.textDark,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
