import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/auth_bloc.dart';
import '../../../../core/design_system/theme/app_colors.dart';
import '../../../../core/design_system/theme/app_typography.dart';
import '../../../../core/design_system/widgets/ev_button.dart';
import '../../../../core/design_system/widgets/liquid_glass_card.dart';
import '../../../../core/design_system/widgets/liquid_glass_scaffold.dart';
import '../../../../core/utils/date_utils.dart' as ev_date;

/// User Identity Portal Login Screen
/// APIs: [02] POST /auth/login
class LoginScreen extends StatefulWidget {
  final String? redirectUrl;

  const LoginScreen({super.key, this.redirectUrl});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isSubmitting = false;  // true only when the user explicitly clicked login

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() => _isSubmitting = true);
      context.read<AuthBloc>().add(AuthLoginRequested(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return LiquidGlassScaffold(
      child: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is! AuthLoading) {
            // Reset submit flag whenever bloc finishes processing
            if (_isSubmitting) setState(() => _isSubmitting = false);
          }
          if (state is AuthAuthenticated) {
            if (widget.redirectUrl != null && widget.redirectUrl!.isNotEmpty) {
              context.go(widget.redirectUrl!);
            } else {
              context.go('/map');
            }
          } else if (state is AuthMfaRequired) {
            context.go('/auth/mfa');
          } else if (state is AuthEmailVerificationRequired) {
            context.go('/auth/verify-email?email=${Uri.encodeComponent(state.email)}');
          }
        },
        builder: (context, state) {
          return SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: LiquidGlassCard(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Logo + brand
                        Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                gradient: AppColors.cyanLimeGradient,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.cyan.withValues(alpha: 0.4),
                                    blurRadius: 20,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.electric_bolt,
                                color: Colors.white,
                                size: 26,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'EVoltSync',
                                  style: AppTypography.headingMd.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? AppColors.textLight : AppColors.textDark,
                                  ),
                                ),
                                Text(
                                  'EV Charging Platform',
                                  style: AppTypography.caption.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // Error banners
                        if (state is AuthError && state.lockedUntil != null)
                          _buildLockoutBanner(state),
                        if (state is AuthError && state.lockedUntil == null)
                          _buildErrorBanner(state.message),

                        // Email field
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          style: AppTypography.bodyMd.copyWith(
                            color: isDark ? AppColors.textLight : AppColors.textDark,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            hintText: 'example@email.com',
                            prefixIcon: Icon(Icons.email_outlined),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Vui lòng nhập email';
                            final emailRegex = RegExp(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$');
                            if (!emailRegex.hasMatch(v.trim())) return 'Email không hợp lệ';
                            return null;
                          },
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // Password field
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _submit(),
                          style: AppTypography.bodyMd.copyWith(
                            color: isDark ? AppColors.textLight : AppColors.textDark,
                          ),
                          decoration: InputDecoration(
                            labelText: 'Mật khẩu',
                            prefixIcon: const Icon(Icons.lock_outlined),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Vui lòng nhập mật khẩu';
                            if (v.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
                            return null;
                          },
                        ),
                        const SizedBox(height: AppSpacing.sm),

                        // Forgot password
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {},
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              'Quên mật khẩu?',
                              style: AppTypography.bodyMd.copyWith(
                                color: AppColors.cyan,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // Login button — isLoading only when user triggered submit
                        EVButton(
                          label: 'Đăng nhập',
                          onPressed: _submit,
                          isLoading: _isSubmitting && state is AuthLoading,
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // Register link
                        Center(
                          child: Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                'Chưa có tài khoản? ',
                                style: AppTypography.bodyMd.copyWith(
                                  color: AppColors.textMuted,
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.go('/auth/register'),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  'Đăng ký ngay',
                                  style: AppTypography.bodyMd.copyWith(
                                    color: AppColors.cyan,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLockoutBanner(AuthError state) {
    String message = state.message;
    if (state.lockedUntil != null) {
      message = 'Tài khoản bị khóa đến ${ev_date.DateUtils.formatDateTime(state.lockedUntil!)}';
    }
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_outlined, color: AppColors.error, size: 18),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(message, style: AppTypography.bodyMd.copyWith(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner(String message) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 18),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(message, style: AppTypography.bodyMd.copyWith(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}
