import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/design_system/theme/app_colors.dart';
import '../../../../core/design_system/theme/app_theme.dart';
import '../../../../core/design_system/theme/app_typography.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class MapSearchBar extends StatelessWidget {
  final TextEditingController searchController;
  final FocusNode searchFocusNode;
  final GlobalKey searchFieldKey;
  final bool isLoading;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onClear;

  const MapSearchBar({
    super.key,
    required this.searchController,
    required this.searchFocusNode,
    required this.searchFieldKey,
    required this.isLoading,
    required this.onChanged,
    required this.onSubmitted,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            key: const ValueKey('search_container'),
            height: 54,
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(AppRadius.full),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: searchFocusNode.hasFocus ? 0.1 : 0.04),
                  blurRadius: searchFocusNode.hasFocus ? 20 : 10,
                  offset: const Offset(0, 4),
                ),
              ],
              border: Border.all(
                color: searchFocusNode.hasFocus
                    ? AppColors.primary.withValues(alpha: 0.5)
                    : Colors.transparent,
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                const SizedBox(width: AppSpacing.lg),
                isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary)),
                      )
                    : Icon(Icons.search_rounded,
                        color: searchFocusNode.hasFocus ? AppColors.primary : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.9),
                        size: 22),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: TextField(
                    key: searchFieldKey,
                    controller: searchController,
                    focusNode: searchFocusNode,
                    decoration: InputDecoration(
                      hintText: 'Bạn muốn sạc ở đâu?',
                      hintStyle: AppTypography.bodyMd.copyWith(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.8)),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      errorBorder: InputBorder.none,
                      disabledBorder: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 16),
                      filled: false,
                    ),
                    style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface),
                    onChanged: onChanged,
                    onSubmitted: onSubmitted,
                  ),
                ),
                if (searchController.text.isNotEmpty)
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.9), size: 20),
                    onPressed: onClear,
                  )
                else
                  const SizedBox(width: AppSpacing.lg),
              ],
            ),
          ),
        ),
        BlocBuilder<AuthBloc, AuthState>(
          builder: (context, authState) {
            if (authState is AuthAuthenticated) return const SizedBox.shrink();
            return Padding(
              padding: const EdgeInsets.only(left: AppSpacing.sm),
              child: _buildLoginButton(context),
            );
          },
        ),
      ],
    );
  }

  Widget _buildLoginButton(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      height: 54,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.full),
        gradient: const LinearGradient(
          colors: [AppColors.primary, Color(0xFF00B248)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.full),
          onTap: () => context.push('/auth/login'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Center(
              child: Text(
                'Đăng nhập',
                style: AppTypography.bodyMd.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
