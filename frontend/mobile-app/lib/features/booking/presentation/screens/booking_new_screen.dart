import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/booking_bloc.dart';
import '../../domain/entities/booking_entity.dart';
import '../../../../core/design_system/app_colors.dart';
import '../../../../core/design_system/app_theme.dart';
import '../../../../core/design_system/app_typography.dart';
import '../../../../core/design_system/ev_button.dart';
import '../../../../core/design_system/alert_banner.dart';
import '../../../../core/utils/date_utils.dart' as ev_date;
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_event_state.dart';

/// Màn hình đặt lịch mới — S-07
/// Hiển thị slot khả dụng, thanh toán wallet-first → VNPay fallback
class BookingNewScreen extends StatefulWidget {
  final String chargerId;
  final String stationId;
  final String connectorType;

  const BookingNewScreen({
    super.key,
    required this.chargerId,
    required this.stationId,
    required this.connectorType,
  });

  @override
  State<BookingNewScreen> createState() => _BookingNewScreenState();
}

class _BookingNewScreenState extends State<BookingNewScreen> {
  DateTime _selectedDate = DateTime.now();
  AvailabilitySlotEntity? _selectedSlot;

  @override
  void initState() {
    super.initState();
    _loadSlots();
  }

  void _loadSlots() {
    context.read<BookingBloc>().add(BookingLoadAvailability(
          chargerId: widget.chargerId,
          date: _selectedDate,
        ));
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final hasArrears =
        authState is AuthAuthenticated && authState.hasArrears;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Đặt lịch sạc'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<BookingBloc, BookingState>(
        listener: (context, state) {
          if (state is BookingCreated) {
            HapticFeedback.heavyImpact();
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Đặt lịch thành công! Vui lòng thanh toán.'),
              backgroundColor: AppColors.primary,
            ));
            context.go('/bookings/${state.booking.id}');
          } else if (state is BookingError) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ));
          }
        },
        builder: (context, state) {
          return Column(
            children: [
              // Arrears guard
              if (hasArrears)
                ArrearsAlertBanner(
                  amount: 'Nợ tồn đọng — không thể đặt lịch',
                  onTap: () => context.go('/wallet'),
                ),

              // Date picker
              _DateSelector(
                selected: _selectedDate,
                onChanged: (d) {
                  setState(() {
                    _selectedDate = d;
                    _selectedSlot = null;
                  });
                  _loadSlots();
                },
              ),

              // Slot grid
              Expanded(
                child: _buildSlotGrid(context, state, hasArrears),
              ),

              // Booking summary + confirm
              if (_selectedSlot != null)
                _BookingSummary(
                  slot: _selectedSlot!,
                  chargerId: widget.chargerId,
                  stationId: widget.stationId,
                  connectorType: widget.connectorType,
                  isLoading: state is BookingLoading,
                  onConfirm: hasArrears
                      ? null
                      : () => _confirmBooking(context),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSlotGrid(
      BuildContext context, BookingState state, bool hasArrears) {
    if (state is BookingLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state is BookingAvailabilityLoaded) {
      if (state.slots.isEmpty) {
        return Center(
          child: Text('Không có slot khả dụng',
              style: AppTypography.bodyMd
                  .copyWith(color: AppColors.grey600)),
        );
      }
      return GridView.builder(
        padding: const EdgeInsets.all(AppSpacing.lg),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 2.2,
          crossAxisSpacing: AppSpacing.sm,
          mainAxisSpacing: AppSpacing.sm,
        ),
        itemCount: state.slots.length,
        itemBuilder: (_, i) {
          final slot = state.slots[i];
          final isSelected = _selectedSlot == slot;
          final isAvailable = slot.isAvailable && !hasArrears;
          return GestureDetector(
            onTap: isAvailable
                ? () => setState(() => _selectedSlot = slot)
                : null,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary
                    : isAvailable
                        ? AppColors.primary.withValues(alpha: 0.08)
                        : Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary
                      : isAvailable
                          ? AppColors.primary.withValues(alpha: 0.3)
                          : AppColors.outlineLight,
                ),
              ),
              child: Center(
                child: Text(
                  ev_date.DateUtils.formatTimeHm(slot.startTime),
                  style: AppTypography.caption.copyWith(
                    color: isSelected
                        ? Colors.white
                        : isAvailable
                            ? AppColors.primary
                            : AppColors.grey400,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          );
        },
      );
    }
    return const Center(child: Text('Chọn ngày để xem slot'));
  }

  void _confirmBooking(BuildContext context) {
    if (_selectedSlot == null) return;
    context.read<BookingBloc>().add(BookingCreate(
          chargerId: widget.chargerId,
          stationId: widget.stationId,
          connectorType: widget.connectorType,
          startTime: _selectedSlot!.startTime,
          endTime: _selectedSlot!.endTime,
        ));
  }
}

class _DateSelector extends StatelessWidget {
  final DateTime selected;
  final ValueChanged<DateTime> onChanged;

  const _DateSelector({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 72,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
        itemCount: 14,
        itemBuilder: (_, i) {
          final date = DateTime.now().add(Duration(days: i));
          final isSelected = ev_date.DateUtils.isSameDay(date, selected);
          return GestureDetector(
            onTap: () => onChanged(date),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 52,
              margin: const EdgeInsets.only(right: AppSpacing.sm),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.outlineLight,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _weekDay(date),
                    style: AppTypography.caption.copyWith(
                      color: isSelected
                          ? Colors.white.withValues(alpha: 0.8)
                          : AppColors.grey600,
                    ),
                  ),
                  Text(
                    '${date.day}',
                    style: AppTypography.headingMd.copyWith(
                      color: isSelected ? Colors.white : null,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _weekDay(DateTime d) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[d.weekday % 7];
  }
}

class _BookingSummary extends StatelessWidget {
  final AvailabilitySlotEntity slot;
  final String chargerId;
  final String stationId;
  final String connectorType;
  final bool isLoading;
  final VoidCallback? onConfirm;

  const _BookingSummary({
    required this.slot,
    required this.chargerId,
    required this.stationId,
    required this.connectorType,
    required this.isLoading,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Xác nhận đặt lịch',
            style: AppTypography.headingMd,
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Từ:', style: AppTypography.bodyMd),
              Text(
                ev_date.DateUtils.formatDateTime(slot.startTime),
                style: AppTypography.bodyMd
                    .copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Đến:', style: AppTypography.bodyMd),
              Text(
                ev_date.DateUtils.formatDateTime(slot.endTime),
                style: AppTypography.bodyMd
                    .copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          EVButton(
            label: isLoading ? 'Đang xử lý...' : 'Xác nhận & Thanh toán',
            onPressed: isLoading ? null : onConfirm,
            icon: Icons.payment_outlined,
          ),
        ],
      ),
    );
  }
}
