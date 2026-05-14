import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  final String flavor;
  final String baseUrl;
  final String wsBaseUrl;
  final bool enableLogging;

  const AppConfig._({
    required this.flavor,
    required this.baseUrl,
    required this.wsBaseUrl,
    required this.enableLogging,
  });

  static AppConfig get current {
    final flavor = dotenv.env['FLAVOR'] ?? 'dev';

    final overrideUrl = dotenv.env['API_BASE_URL'] ?? '';

    switch (flavor) {
      case 'prod':
        final url =
            overrideUrl.isNotEmpty ? overrideUrl : 'https://api.ev-charging.vn';
        return AppConfig._(
          flavor: 'prod',
          baseUrl: url,
          wsBaseUrl: url
              .replaceFirst('https://', 'wss://')
              .replaceFirst('http://', 'ws://'),
          enableLogging: false,
        );
      case 'staging':
        final url = overrideUrl.isNotEmpty
            ? overrideUrl
            : 'https://api-staging.ev-charging.vn';
        return AppConfig._(
          flavor: 'staging',
          baseUrl: url,
          wsBaseUrl: url
              .replaceFirst('https://', 'wss://')
              .replaceFirst('http://', 'ws://'),
          enableLogging: true,
        );
      default:
        final url =
            overrideUrl.isNotEmpty ? overrideUrl : 'http://localhost:8000';
        return AppConfig._(
          flavor: 'dev',
          baseUrl: url,
          wsBaseUrl: url
              .replaceFirst('https://', 'wss://')
              .replaceFirst('http://', 'ws://'),
          enableLogging: true,
        );
    }
  }

  bool get isDev => flavor == 'dev';
  bool get isStaging => flavor == 'staging';
  bool get isProd => flavor == 'prod';
}
