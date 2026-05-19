import 'package:flutter/material.dart';
import '../../../../core/design_system/theme/app_colors.dart';
import '../../../../core/design_system/theme/app_typography.dart';

class MapFilterBar extends StatelessWidget {
  final List<String> connectorTypes;
  final String? selectedConnector;
  final ValueChanged<String?> onFilterChanged;

  const MapFilterBar({
    super.key,
    required this.connectorTypes,
    required this.selectedConnector,
    required this.onFilterChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildChip(
            context: context,
            label: 'Tất cả',
            isSelected: selectedConnector == null,
            onTap: () => onFilterChanged(null),
          ),
          ...connectorTypes.map((type) => _buildChip(
                context: context,
                label: type,
                isSelected: selectedConnector == type,
                onTap: () => onFilterChanged(type),
              )),
        ],
      ),
    );
  }

  Widget _buildChip({
    required BuildContext context,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8.0), // AppSpacing.sm
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0), // lg, sm
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(999), // full
            border: Border.all(
              color: isSelected ? AppColors.primary : Theme.of(context).colorScheme.outline,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
          ),
          child: Text(
            label,
            style: AppTypography.caption.copyWith(
              color: isSelected ? Colors.white : Theme.of(context).colorScheme.onSurface,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
