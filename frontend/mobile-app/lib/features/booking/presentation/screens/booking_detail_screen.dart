import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../bloc/booking_bloc.dart';
import '../../domain/entities/booking_entity.dart';
import '../../../../core/design_system/app_colors.dart';
import '../../../../core/design_system/app_theme.dart';
import '../../../../core/design_system/app_typography.dart';
import '../../../../core/design_system/ev_button.dart';
import '../../../../core/utils/vnd_formatter.dart';
import '../../../../core/utils/date_utils.dart' as ev_date;

/// Màn hình chi tiết đặt lịch — S-08
class BookingDetailScreen extends StatefulWidget {
  final String bookingId;
  const BookingDetailScreen({super.key, required this.bookingId});

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  Timer? _timer;
  Duration _qrRemaining = Duration.zero;
  bool _qrValid = false;

  @override
  void initState() {
    super.initState();
    context.read<BookingBloc>().add(BookingLoadDetail(id: widget.bookingId));
  }

  void _startCountdown(BookingEntity b) {
    _timer?.cancel();
    _tick(b);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) _tick(b);
    });
  }

  void _tick(BookingEntity b) {
    final now = DateTime.now();
    final from = b.startTime.subtract(const Duration(minutes: 15));
    final until = b.endTime.add(const Duration(minutes: 5));
    final valid = now.isAfter(from) && now.isBefore(until);
    setState(() {
      _qrValid = valid;
      _qrRemaining = valid
          ? until.difference(now)
          : now.isBefore(from)
              ? from.difference(now)
              : Duration.zero;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết đặt lịch'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<BookingBloc, BookingState>(
        listener: (context, state) {
          if (state is BookingDetailLoaded) _startCountdown(state.booking);
          if (state is BookingCancelled) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Đã hủy'), backgroundColor: AppColors.primary));
            context.go('/bookings');
          }
        },
        builder: (context, state) {
          if (state is BookingLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is BookingDetailLoaded) {
            return _buildDetail(context, state.booking);
          }
          if (state is BookingError) {
            return Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(state.message, style: AppTypography.bodyMd.copyWith(color: AppColors.error)),
                const SizedBox(height: AppSpacing.lg),
                EVButton(
                  label: 'Thử lại',
                  variant: EVButtonVariant.secondary,
                  onPressed: () => context.read<BookingBloc>().add(BookingLoadDetail(id: widget.bookingId)),
                ),
              ]),
            );
          }
          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }

  Widget _buildDetail(BuildContext context, BookingEntity b) {
    Color statusColor;
    String statusLabel;
    switch (b.status) {
      case 'CONFIRMED':      statusColor = AppColors.chargerAvailable; statusLabel = 'Đã xác nhận'; break;
      case 'PENDING_PAYMENT':statusColor = AppColors.amber;            statusLabel = 'Chờ thanh toán'; break;
      case 'COMPLETED':      statusColor = AppColors.secondary;        statusLabel = 'Hoàn thành'; break;
      case 'CANCELLED':      statusColor = AppColors.grey400;          statusLabel = 'Đã hủy'; break;
      case 'EXPIRED':        statusColor = AppColors.grey400;          statusLabel = 'Hết hạn'; break;
      case 'NO_SHOW':        statusColor = AppColors.error;            statusLabel = 'Không đến (phạt 20%)'; break;
      default:               statusColor = AppColors.grey400;          statusLabel = b.status;
    }

    final now = DateTime.now();
    final from = b.startTime.subtract(const Duration(minutes: 15));
    final isNotYet = now.isBefore(from);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(children: [
        // Status
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppRadius.full),
            border: Border.all(color: statusColor.withValues(alpha: 0.3)),
          ),
          child: Text(statusLabel, style: AppTypography.bodyMd.copyWith(color: statusColor, fontWeight: FontWeight.w600)),
        ),
        const SizedBox(height: AppSpacing.xl),

        // QR
        if (b.qrToken != null && b.isConfirmed) ...[
          Text('Mã QR sạc điện', style: AppTypography.headingMd),
          const SizedBox(height: AppSpacing.md),
          if (_qrValid)
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.15), blurRadius: 20)],
              ),
              child: QrImageView(data: b.qrToken!, version: QrVersions.auto, size: 200,
                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: AppColors.primary)),
            )
          else
            Container(
              width: 200, height: 200,
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(AppRadius.lg)),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(isNotYet ? Icons.schedule_outlined : Icons.timer_off_outlined, size: 48, color: AppColors.grey400),
                const SizedBox(height: AppSpacing.sm),
                Text(isNotYet ? 'Chưa đến giờ' : 'QR đã hết hạn',
                    style: AppTypography.bodyMd.copyWith(color: AppColors.grey600)),
              ]),
            ),
          const SizedBox(height: AppSpacing.sm),
          if (_qrRemaining > Duration.zero)
            Text(
              _qrValid ? 'Hết hạn sau: ${ev_date.DateUtils.formatCountdown(_qrRemaining)}'
                       : 'Mở sau: ${ev_date.DateUtils.formatCountdown(_qrRemaining)}',
              style: AppTypography.bodyMd.copyWith(
                  color: _qrValid ? AppColors.primary : AppColors.grey600, fontWeight: FontWeight.w600),
            ),
          const SizedBox(height: AppSpacing.xl),
        ],

        // Info
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: Theme.of(context).colorScheme.outline),
          ),
          child: Column(children: [
            _InfoRow(icon: Icons.cable_outlined, label: 'Đầu sạc', value: b.connectorType),
            const Divider(height: AppSpacing.lg),
            _InfoRow(icon: Icons.play_circle_outline, label: 'Bắt đầu', value: ev_date.DateUtils.formatDateTime(b.startTime)),
            const Divider(height: AppSpacing.lg),
            _InfoRow(icon: Icons.stop_circle_outlined, label: 'Kết thúc', value: ev_date.DateUtils.formatDateTime(b.endTime)),
            if (b.depositAmount > 0) ...[
              const Divider(height: AppSpacing.lg),
              _InfoRow(icon: Icons.payment_outlined, label: 'Đặt cọc', value: VndFormatter.format(b.depositAmount)),
            ],
            if (b.penaltyAmount != null) ...[
              const Divider(height: AppSpacing.lg),
              _InfoRow(icon: Icons.warning_amber_outlined, label: 'Phạt NO_SHOW',
                  value: VndFormatter.format(b.penaltyAmount!), valueColor: AppColors.error),
            ],
          ]),
        ),
        const SizedBox(height: AppSpacing.xl),

        if (b.isCancellable)
          EVButton(
            label: 'Hủy đặt lịch (hoàn 100%)',
            variant: EVButtonVariant.danger,
            icon: Icons.cancel_outlined,
            onPressed: () => showDialog(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text('Xác nhận hủy?'),
                content: const Text('Bạn sẽ được hoàn 100% tiền đặt cọc.'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('Không')),
                  TextButton(
                    onPressed: () { Navigator.pop(context); context.read<BookingBloc>().add(BookingCancel(id: b.id)); },
                    child: Text('Hủy', style: TextStyle(color: AppColors.error)),
                  ),
                ],
              ),
            ),
          ),
      ]),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;
  const _InfoRow({required this.icon, required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, size: 18, color: AppColors.grey600),
    const SizedBox(width: AppSpacing.sm),
    Text(label, style: AppTypography.bodyMd.copyWith(color: AppColors.grey600)),
    const Spacer(),
    Text(value, style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600, color: valueColor)),
  ]);
}
