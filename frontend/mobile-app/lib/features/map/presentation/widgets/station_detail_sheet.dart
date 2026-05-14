import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/design_system/app_colors.dart';
import '../../../../core/design_system/app_theme.dart';
import '../../../../core/design_system/app_typography.dart';
import '../../../../core/design_system/ev_button.dart';
import '../../../../core/utils/vnd_formatter.dart';
import '../../domain/entities/station_entity.dart';
import '../bloc/map_bloc.dart';
import '../bloc/map_event_state.dart';
import 'pricing_dialog.dart';

/// Bottom sheet chi tiết trạm sạc — S-05
class StationDetailSheet extends StatelessWidget {
  final StationEntity station;
  final LatLng? userLocation;

  const StationDetailSheet({
    super.key,
    required this.station,
    this.userLocation,
  });

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.5,
      minChildSize: 0.3,
      maxChildSize: 0.85,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppRadius.xl),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.outlineLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg),
                  children: [
                    // Header
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                station.name,
                                style: AppTypography.headingMd,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                station.address,
                                style: AppTypography.bodyMd.copyWith(
                                  color: AppColors.grey600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (station.distanceKm != null)
                          Text(
                            '${station.distanceKm!.toStringAsFixed(1)} km',
                            style: AppTypography.bodyMd.copyWith(
                              color: AppColors.secondary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // Lưới trạm sạc
                    Text(
                      'Số trụ sạc: ${station.chargers.length}',
                      style: AppTypography.headingMd,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 1.1,
                        crossAxisSpacing: AppSpacing.sm,
                        mainAxisSpacing: AppSpacing.sm,
                      ),
                      itemCount: station.chargers.length,
                      itemBuilder: (context, index) {
                        final charger = station.chargers[index];
                        final color =
                            AppColors.forChargerStatus(charger.status);
                        return Container(
                          padding:
                              const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.08),
                            borderRadius:
                                BorderRadius.circular(AppRadius.sm),
                            border: Border.all(
                                color: color.withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                charger.connectorType,
                                style: AppTypography.caption.copyWith(
                                  color: color,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                '${charger.powerKw.toStringAsFixed(0)} kW',
                                style: AppTypography.bodyMd.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (charger.pricePerKwh != null)
                                Text(
                                  '${VndFormatter.format(charger.pricePerKwh!)}/kWh',
                                  style: AppTypography.caption.copyWith(
                                    color: AppColors.grey600,
                                  ),
                                ),
                              const Spacer(),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  InkWell(
                                    onTap: () {
                                      showDialog(
                                        context: context,
                                        builder: (_) => PricingDialog(
                                          stationId: station.id,
                                          charger: charger,
                                        ),
                                      );
                                    },
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                                      child: Text(
                                        'Xem báo giá',
                                        style: AppTypography.caption.copyWith(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w600,
                                          decoration: TextDecoration.underline,
                                          decorationColor: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  ),
                                  InkWell(
                                    onTap: () {
                                      Navigator.pop(context);
                                      context.push('/bookings/new', extra: {
                                        'stationId': station.id,
                                        'chargerId': charger.id,
                                        'connectorType': charger.connectorType,
                                      });
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary,
                                        borderRadius: BorderRadius.circular(AppRadius.sm),
                                      ),
                                      child: Text(
                                        'Đặt lịch',
                                        style: AppTypography.caption.copyWith(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // Nút hành động
                    EVButton(
                      label: 'Chỉ đường đến trạm',
                      icon: Icons.directions_outlined,
                      onPressed: () {
                        Navigator.pop(context);
                        
                        // Sử dụng vị trí GPS thực tế được truyền từ MapHomeScreen
                        double userLat = userLocation?.latitude ?? 0.0;
                        double userLng = userLocation?.longitude ?? 0.0;

                        if (userLat == 0.0) {
                          final state = context.read<MapBloc>().state;
                          if (state is MapLoaded) {
                            userLat = state.userLat;
                            userLng = state.userLng;
                          }
                        }

                        if (userLat == 0.0 || userLng == 0.0) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Không xác định được vị trí của bạn. Vui lòng bật GPS.')),
                          );
                          return;
                        }

                        context.push(
                          '/map/station/${station.id}/route',
                          extra: {
                            'stationLat': station.latitude,
                            'stationLng': station.longitude,
                            'stationName': station.name,
                            'userLat': userLat,
                            'userLng': userLng,
                          },
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.xl),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
