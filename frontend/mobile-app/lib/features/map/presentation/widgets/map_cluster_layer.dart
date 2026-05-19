import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../domain/entities/station_entity.dart';
import 'station_marker.dart';

class MapClusterLayer extends StatelessWidget {
  final List<StationEntity> stations;
  final String? selectedStationId;
  final Function(StationEntity) onStationTapped;
  final MapController mapController;

  const MapClusterLayer({
    super.key,
    required this.stations,
    required this.selectedStationId,
    required this.onStationTapped,
    required this.mapController,
  });

  @override
  Widget build(BuildContext context) {
    return MarkerClusterLayerWidget(
      key: ValueKey('cluster_layer_${stations.length}_${selectedStationId ?? 'none'}'),
      options: MarkerClusterLayerOptions(
        maxClusterRadius: 50,
        size: const Size(65, 65),
        rotate: true,
        markers: stations.map((station) {
          final isSelected = selectedStationId == station.id;
          return Marker(
            key: ValueKey('station_${station.id}'),
            point: LatLng(station.latitude, station.longitude),
            width: isSelected ? 55 : 45,
            height: isSelected ? 75 : 60,
            rotate: true,
            alignment: Alignment.topCenter,
            child: StationMarker(
              station: station,
              isSelected: isSelected,
              onTap: () {},
            ),
          );
        }).toList(),
        onMarkerTap: (marker) {
          final key = marker.key as ValueKey<String>?;
          if (key == null) return;
          final stationId = key.value.replaceFirst('station_', '');
          final station = stations.firstWhere((s) => s.id == stationId);
          onStationTapped(station);
        },
        builder: (context, markers) => GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            if (markers.isEmpty) return;
            final points = markers.map((m) => m.point).toList();
            final bounds = LatLngBounds.fromPoints(points);
            mapController.fitCamera(
              CameraFit.bounds(
                bounds: bounds,
                padding: const EdgeInsets.all(120),
              ),
            );
          },
          child: Container(
            width: 65,
            height: 65,
            decoration: const BoxDecoration(
              color: Colors.transparent,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: SvgPicture.string(
                '''
                <svg width="65" height="65" viewBox="0 0 65 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="grad_green_modern" x1="0" y1="0" x2="65" y2="65" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#34D399"/>
                      <stop offset="1" stop-color="#059669"/>
                    </linearGradient>
                  </defs>
                  <circle cx="32.5" cy="32.5" r="30" fill="#10B981" fill-opacity="0.1"/>
                  <circle cx="32.5" cy="32.5" r="25" stroke="#34D399" stroke-width="1" stroke-opacity="0.4"/>
                  <circle cx="32.5" cy="32.5" r="22" stroke="white" stroke-width="2" stroke-opacity="0.8"/>
                  <circle cx="32.5" cy="32.5" r="19" fill="url(#grad_green_modern)"/>
                  <path d="M19 26C22 19 29 16 36 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.3"/>
                  <text x="32.5" y="38" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="16" fill="white">${markers.length}</text>
                </svg>
                ''',
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Helper because latlong2 LatLng cannot be imported if not in same file usually,
  // but we can just use the properties. Wait, we need to import latlong2.
}
