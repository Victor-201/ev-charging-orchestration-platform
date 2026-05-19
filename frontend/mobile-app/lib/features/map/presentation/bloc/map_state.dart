part of 'map_bloc.dart';

/// Geospatial Mapping States
sealed class MapState extends Equatable {
  const MapState();
  @override
  List<Object?> get props => [];
}

final class MapInitial extends MapState {
  const MapInitial();
}

final class MapLoading extends MapState {
  const MapLoading();
}

final class MapLoaded extends MapState {
  /// Currently displayed stations (filtered from the unified cache).
  final List<StationEntity> stations;
  final StationEntity? selectedStation;
  final double userLat;
  final double userLng;
  final String? activeConnectorFilter;
  final String? activeStatusFilter;

  const MapLoaded({
    required this.stations,
    this.selectedStation,
    required this.userLat,
    required this.userLng,
    this.activeConnectorFilter,
    this.activeStatusFilter,
  });

  @override
  List<Object?> get props => [
        stations,
        selectedStation,
        userLat,
        userLng,
        activeConnectorFilter,
        activeStatusFilter,
      ];

  MapLoaded copyWith({
    List<StationEntity>? stations,
    StationEntity? selectedStation,
    double? userLat,
    double? userLng,
    Object? activeConnectorFilter = _kUnset,
    Object? activeStatusFilter = _kUnset,
    bool clearSelectedStation = false,
  }) {
    return MapLoaded(
      stations: stations ?? this.stations,
      selectedStation:
          clearSelectedStation ? null : (selectedStation ?? this.selectedStation),
      userLat: userLat ?? this.userLat,
      userLng: userLng ?? this.userLng,
      activeConnectorFilter: activeConnectorFilter == _kUnset
          ? this.activeConnectorFilter
          : activeConnectorFilter as String?,
      activeStatusFilter: activeStatusFilter == _kUnset
          ? this.activeStatusFilter
          : activeStatusFilter as String?,
    );
  }
}

final class MapError extends MapState {
  final String message;
  const MapError({required this.message});
  @override
  List<Object?> get props => [message];
}
