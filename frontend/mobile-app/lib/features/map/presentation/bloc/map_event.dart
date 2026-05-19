part of 'map_bloc.dart';

// Sentinel object: lets copyWith distinguish "not passed" from "explicitly null".
const Object _kUnset = Object();

/// Geospatial Mapping Events
///
/// Implements a hybrid viewport loading strategy. Viewport pans/zooms trigger
/// [MapLoadStations] with lat/lng/radius. BLoC uses a containment cache to skip
/// redundant requests, ensuring high performance.
sealed class MapEvent extends Equatable {
  const MapEvent();
  @override
  List<Object?> get props => [];
}

/// Triggers dynamic load around coordinates and radius.
final class MapLoadStations extends MapEvent {
  final double lat;
  final double lng;
  final double radiusKm;
  final double? visibleRadiusKm;
  final String? connectorType;
  final String? statusFilter;

  const MapLoadStations({
    required this.lat,
    required this.lng,
    required this.radiusKm,
    this.visibleRadiusKm,
    this.connectorType,
    this.statusFilter,
  });

  @override
  List<Object?> get props =>
      [lat, lng, radiusKm, visibleRadiusKm, connectorType, statusFilter];
}

/// Updates the user's GPS position — does NOT trigger an API call.
final class MapLocationUpdated extends MapEvent {
  final double lat;
  final double lng;
  const MapLocationUpdated({required this.lat, required this.lng});
  @override
  List<Object?> get props => [lat, lng];
}

/// Requests detail for a tapped station.
final class MapStationTapped extends MapEvent {
  final String stationId;
  const MapStationTapped({required this.stationId});
  @override
  List<Object?> get props => [stationId];
}

/// Applies connector-type / status filters.
final class MapFilterChanged extends MapEvent {
  final String? connectorType;
  final String? statusFilter;
  const MapFilterChanged({this.connectorType, this.statusFilter});
  @override
  List<Object?> get props => [connectorType, statusFilter];
}
