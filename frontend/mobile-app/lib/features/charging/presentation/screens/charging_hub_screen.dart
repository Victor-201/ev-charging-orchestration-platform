import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/charging_session_bloc.dart';
import '../../domain/entities/charging_session_entity.dart';
import '../../../../core/design_system/app_colors.dart';
import '../../../../core/design_system/app_theme.dart';
import '../../../../core/design_system/app_typography.dart';
import '../../../../core/design_system/ev_button.dart';
import '../../../../core/utils/vnd_formatter.dart';

/// Màn hình hub sạc điện — Tab 2
/// Gồm 2 tab: Sạc nhanh (QR) + Lịch sử phiên sạc
class ChargingHubScreen extends StatelessWidget {
  const ChargingHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Sạc điện'),
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.qr_code_scanner_outlined), text: 'Quét QR'),
              Tab(icon: Icon(Icons.history_outlined), text: 'Lịch sử'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _QuickChargeTab(),
            _ChargingHistoryTab(),
          ],
        ),
      ),
    );
  }
}

/// Tab quét QR / phiên sạc đang hoạt động
class _QuickChargeTab extends StatelessWidget {
  const _QuickChargeTab();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ChargingSessionBloc, ChargingState>(
      builder: (context, state) {
        if (state is ChargingActive) {
          // Có phiên đang sạc → hiển thị card phiên
          return _ActiveSessionCard(session: state.session);
        }
        // Chưa sạc → hiển thị nút QR scan
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(children: [
            const SizedBox(height: AppSpacing.xxxl),
            Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.secondary],
                ),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 24, offset: const Offset(0, 8))],
              ),
              child: const Icon(Icons.bolt, color: Colors.white, size: 56),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text('Bắt đầu sạc', style: AppTypography.headingLg),
            const SizedBox(height: AppSpacing.sm),
            Text('Quét mã QR tại cọc sạc để bắt đầu phiên sạc',
                style: AppTypography.bodyMd.copyWith(color: AppColors.grey600),
                textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.xxxl),
            EVButton(
              label: 'Quét mã QR',
              icon: Icons.qr_code_scanner_outlined,
              onPressed: () => context.push('/charging/scan'),
            ),
          ]),
        );
      },
    );
  }
}

class _ActiveSessionCard extends StatelessWidget {
  final ChargingSessionEntity session;
  const _ActiveSessionCard({required this.session});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.xl),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: [AppColors.primary.withValues(alpha: 0.9), AppColors.secondary.withValues(alpha: 0.9)],
            ),
            borderRadius: BorderRadius.circular(AppRadius.xl),
            boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.25), blurRadius: 20, offset: const Offset(0, 8))],
          ),
          child: Column(children: [
            Row(children: [
              Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text('ĐANG SẠC', style: AppTypography.caption.copyWith(color: Colors.white, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
            ]),
            const SizedBox(height: AppSpacing.lg),
            Text('${session.socPercent.toStringAsFixed(0)}%',
                style: AppTypography.displayLg.copyWith(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 64)),
            Text('Trạng thái pin', style: AppTypography.caption.copyWith(color: Colors.white70)),
            const SizedBox(height: AppSpacing.lg),
            Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
              _QuickStat(label: '${(session.powerW / 1000).toStringAsFixed(1)} kW', sublabel: 'Công suất'),
              _QuickStat(label: '${session.energyKwh.toStringAsFixed(2)} kWh', sublabel: 'Điện năng'),
              _QuickStat(label: VndFormatter.format(session.amountDue), sublabel: 'Chi phí'),
            ]),
          ]),
        ),
        const SizedBox(height: AppSpacing.xl),
        EVButton(
          label: 'Xem chi tiết phiên sạc',
          icon: Icons.open_in_new_outlined,
          onPressed: () => context.push('/charging/session/${session.id}'),
        ),
      ]),
    );
  }
}

class _QuickStat extends StatelessWidget {
  final String label;
  final String sublabel;
  const _QuickStat({required this.label, required this.sublabel});

  @override
  Widget build(BuildContext context) => Column(children: [
    Text(label, style: AppTypography.bodyMd.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
    Text(sublabel, style: AppTypography.caption.copyWith(color: Colors.white70)),
  ]);
}

/// Tab lịch sử phiên sạc — [53] GET /charging/history
class _ChargingHistoryTab extends StatelessWidget {
  const _ChargingHistoryTab();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text('Lịch sử phiên sạc sẽ hiển thị ở đây'),
    );
  }
}
