import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../domain/entities/station_entity.dart';
import 'station_marker_svgs.dart';

/// Marker trạm sạc với UI mới sử dụng SVG động
class StationMarker extends StatelessWidget {
  final StationEntity station;
  final bool isSelected;
  final VoidCallback onTap;

  const StationMarker({
    super.key,
    required this.station,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final statusData = _getStationStatusData(station);

    return SizedBox(
      width: isSelected ? 45 : 35,
      height: isSelected ? 60 : 48,
      child: SvgPicture.string(
          StationMarkerSvgs.getSvg(
            status: statusData.statusKey,
            text: statusData.text,
            isSelected: isSelected,
          ),
          fit: BoxFit.contain,
        ),
    );
  }

  _MarkerStatusData _getStationStatusData(StationEntity station) {
    // 1. Kiểm tra trạng thái chung của trạm
    if (station.status.toLowerCase() == 'closed') {
      return _MarkerStatusData('closed', 'CLOSE');
    }
    if (station.status.toLowerCase() == 'maintenance') {
      return _MarkerStatusData('maintenance', 'MAINT');
    }
    if (station.status.toLowerCase() == 'inactive') {
      return _MarkerStatusData('inactive', 'OFF');
    }

    // 2. Nếu trạng thái là 'active', kiểm tra chi tiết các trụ sạc
    final chargers = station.chargers;
    if (chargers.isEmpty) {
      return _MarkerStatusData('inactive', '0/0');
    }

    int inUseCount = chargers.where((c) => ['IN_USE', 'RESERVED', 'FAULTED'].contains(c.status)).length;
    int availableCount = chargers.where((c) => c.status == 'AVAILABLE').length;
    int total = chargers.length;

    // Trạng thái Active - Full (không còn trụ trống) -> Màu đỏ
    if (availableCount == 0) {
      return _MarkerStatusData('active_full', '$inUseCount/$total');
    }

    // Trạng thái Active - Có trụ trống -> Màu xanh
    return _MarkerStatusData('active_empty', '$availableCount/$total');
  }
}

class _MarkerStatusData {
  final String statusKey;
  final String text;

  _MarkerStatusData(this.statusKey, this.text);
}
