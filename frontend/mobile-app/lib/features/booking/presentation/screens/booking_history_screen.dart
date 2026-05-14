import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/booking_bloc.dart';
import '../../domain/entities/booking_entity.dart';
import '../../../../core/design_system/app_colors.dart';
import '../../../../core/design_system/app_theme.dart';
import '../../../../core/design_system/app_typography.dart';
import '../../../../core/design_system/ev_button.dart';
import '../../../../core/utils/date_utils.dart' as ev_date;

/// Màn hình lịch sử đặt lịch — S-07 list
class BookingHistoryScreen extends StatefulWidget {
  const BookingHistoryScreen({super.key});

  @override
  State<BookingHistoryScreen> createState() => _BookingHistoryScreenState();
}

class _BookingHistoryScreenState extends State<BookingHistoryScreen> {
  @override
  void initState() {
    super.initState();
    context.read<BookingBloc>().add(const BookingLoadHistory());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đặt lịch của tôi'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => context.push('/bookings/new'),
          ),
        ],
      ),
      body: BlocBuilder<BookingBloc, BookingState>(
        builder: (context, state) {
          if (state is BookingLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is BookingHistoryLoaded) {
            if (state.bookings.isEmpty) {
              return Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.event_busy_outlined,
                      size: 72, color: AppColors.grey400),
                  const SizedBox(height: AppSpacing.lg),
                  Text('Chưa có lịch đặt nào',
                      style: AppTypography.headingMd
                          .copyWith(color: AppColors.grey600)),
                  const SizedBox(height: AppSpacing.sm),
                  Text('Nhấn + để đặt lịch sạc mới',
                      style: AppTypography.bodyMd
                          .copyWith(color: AppColors.grey400)),
                  const SizedBox(height: AppSpacing.xl),
                  EVButton(
                    label: 'Đặt lịch ngay',
                    onPressed: () => context.push('/bookings/new'),
                  ),
                ]),
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<BookingBloc>().add(const BookingLoadHistory()),
              child: ListView.separated(
                padding: const EdgeInsets.all(AppSpacing.lg),
                itemCount: state.bookings.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.sm),
                itemBuilder: (_, i) =>
                    _BookingCard(booking: state.bookings[i]),
              ),
            );
          }
          if (state is BookingError) {
            return Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                const SizedBox(height: AppSpacing.md),
                Text(state.message,
                    style: AppTypography.bodyMd.copyWith(color: AppColors.error),
                    textAlign: TextAlign.center),
                const SizedBox(height: AppSpacing.lg),
                EVButton(
                  label: 'Thử lại',
                  variant: EVButtonVariant.secondary,
                  onPressed: () => context.read<BookingBloc>().add(const BookingLoadHistory()),
                ),
              ]),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final BookingEntity booking;
  const _BookingCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusLabel;
    switch (booking.status) {
      case 'CONFIRMED':       statusColor = AppColors.chargerAvailable; statusLabel = 'Đã xác nhận'; break;
      case 'PENDING_PAYMENT': statusColor = AppColors.amber;            statusLabel = 'Chờ thanh toán'; break;
      case 'COMPLETED':       statusColor = AppColors.secondary;        statusLabel = 'Hoàn thành'; break;
      case 'CANCELLED':       statusColor = AppColors.grey400;          statusLabel = 'Đã hủy'; break;
      case 'EXPIRED':         statusColor = AppColors.grey400;          statusLabel = 'Hết hạn'; break;
      case 'NO_SHOW':         statusColor = AppColors.error;            statusLabel = 'Không đến'; break;
      default:                statusColor = AppColors.grey400;          statusLabel = booking.status;
    }

    return GestureDetector(
      onTap: () => context.push('/bookings/${booking.id}'),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: statusColor.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(children: [
          Container(
            width: 4,
            height: 60,
            decoration: BoxDecoration(
              color: statusColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.cable_outlined, size: 16, color: AppColors.grey600),
                const SizedBox(width: 4),
                Text(booking.connectorType,
                    style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(statusLabel,
                      style: AppTypography.caption.copyWith(color: statusColor, fontWeight: FontWeight.w600)),
                ),
              ]),
              const SizedBox(height: 4),
              Text(
                '${ev_date.DateUtils.formatDateTime(booking.startTime)} → ${ev_date.DateUtils.formatTimeHm(booking.endTime)}',
                style: AppTypography.caption.copyWith(color: AppColors.grey600),
              ),
            ]),
          ),
          const Icon(Icons.chevron_right, color: AppColors.grey400),
        ]),
      ),
    );
  }
}
