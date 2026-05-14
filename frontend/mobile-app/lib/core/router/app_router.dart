import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/bloc/auth_event_state.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/welcome_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/mfa_verify_screen.dart';
import '../../features/auth/presentation/screens/email_verification_screen.dart';
import '../../features/auth/presentation/screens/verify_email_pending_screen.dart';
import '../../features/auth/presentation/screens/magic_link_verify_screen.dart';
import '../../features/map/presentation/screens/map_home_screen.dart';
import '../../features/map/presentation/screens/route_navigation_screen.dart';
import '../../features/booking/presentation/screens/booking_history_screen.dart';
import '../../features/booking/presentation/screens/booking_new_screen.dart';
import '../../features/booking/presentation/screens/booking_detail_screen.dart';
import '../../features/booking/presentation/screens/queue_status_screen.dart';
import '../../features/charging/presentation/screens/charging_hub_screen.dart';
import '../../features/charging/presentation/screens/qr_scan_screen.dart';
import '../../features/charging/presentation/screens/active_session_screen.dart';
import '../../features/charging/presentation/screens/session_summary_screen.dart';
import '../../features/charging/domain/entities/charging_session_entity.dart';
import '../../features/wallet/presentation/screens/wallet_dashboard_screen.dart';
import '../../features/wallet/presentation/screens/vnpay_processing_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/vehicles_screen.dart';
import '../../features/profile/presentation/screens/security_settings_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';

/// Router ứng dụng — ShellRoute 5-tab từ §3.3
class AppRouter {
  final AuthBloc authBloc;
  AppRouter({required this.authBloc});

  late final GoRouter router = GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: false,
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isAuth      = authState is AuthAuthenticated;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isPublic    = state.matchedLocation == '/splash' || state.matchedLocation == '/welcome' || state.matchedLocation.startsWith('/map');
      if (isAuth && isAuthRoute) return '/map';
      if (!isAuth && !isAuthRoute && !isPublic) return '/auth/login?redirect=${state.uri}';
      return null;
    },
    routes: [
      // ── Public ─────────────────────────────────────────────────────
      GoRoute(path: '/splash',   name: 'splash',   builder: (_, __) => const SplashScreen()),
      GoRoute(
        path: '/welcome',
        name: 'welcome',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const WelcomeScreen(),
          transitionDuration: Duration.zero,
          transitionsBuilder: (context, animation, secondaryAnimation, child) => child,
        ),
      ),

      // ── Auth ───────────────────────────────────────────────────────
      GoRoute(
        path: '/auth/login',
        name: 'login',
        pageBuilder: (context, state) {
          final redirect = state.uri.queryParameters['redirect'];
          return CustomTransitionPage(
            key: state.pageKey,
            child: LoginScreen(redirectUrl: redirect),
            transitionDuration: Duration.zero,
            transitionsBuilder: (context, animation, secondaryAnimation, child) => child,
          );
        },
      ),
      GoRoute(
        path: '/auth/register',
        name: 'register',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const RegisterScreen(),
          transitionDuration: Duration.zero,
          transitionsBuilder: (context, animation, secondaryAnimation, child) => child,
        ),
      ),
      GoRoute(path: '/auth/mfa',       name: 'mfa-verify',builder: (_, __) => const MFAVerifyScreen()),
      GoRoute(
        path: '/auth/verify-email',
        name: 'verify-email',
        builder: (_, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return VerifyEmailPendingScreen(email: email);
        },
      ),
      GoRoute(
        path: '/auth/verify',
        name: 'verify-magic-link',
        builder: (_, state) {
          final token = state.uri.queryParameters['token'] ?? '';
          return MagicLinkVerifyScreen(token: token);
        },
      ),

      // ── Shell — 5 tab ──────────────────────────────────────────────
      StatefulShellRoute.indexedStack(
        builder: (context, state, nav) => _AppScaffold(navigationShell: nav),
        branches: [

          // Tab 0: Bản đồ
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/map', name: 'map',
              builder: (_, __) => const MapHomeScreen(),
              routes: [
                GoRoute(
                  path: 'station/:id/route', name: 'route-navigation',
                  builder: (_, state) {
                    final extra = state.extra as Map<String, dynamic>? ?? {};
                    return RouteNavigationScreen(
                      stationId:   state.pathParameters['id']!,
                      stationLat:  (extra['stationLat']  as num?)?.toDouble() ?? 0.0,
                      stationLng:  (extra['stationLng']  as num?)?.toDouble() ?? 0.0,
                      stationName: extra['stationName']?.toString() ?? 'Trạm sạc',
                      userLat:     (extra['userLat']     as num?)?.toDouble() ?? 0.0,
                      userLng:     (extra['userLng']     as num?)?.toDouble() ?? 0.0,
                    );
                  },
                ),

              ],
            ),
          ]),

          // Tab 1: Đặt lịch
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/bookings', name: 'booking-history',
              builder: (_, __) => const BookingHistoryScreen(),
              routes: [
                GoRoute(
                  path: 'new', name: 'booking-new',
                  builder: (_, state) {
                    final extra = state.extra as Map<String, String>? ?? {};
                    return BookingNewScreen(
                      chargerId:     extra['chargerId']     ?? '',
                      stationId:     extra['stationId']     ?? '',
                      connectorType: extra['connectorType'] ?? 'CCS',
                    );
                  },
                ),
                GoRoute(
                  path: ':id', name: 'booking-detail',
                  builder: (_, state) => BookingDetailScreen(bookingId: state.pathParameters['id']!),
                ),
                GoRoute(
                  path: 'queue/:chargerId', name: 'queue-status',
                  builder: (_, state) => QueueStatusScreen(chargerId: state.pathParameters['chargerId']!),
                ),
              ],
            ),
          ]),

          // Tab 2: Sạc điện
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/charging', name: 'charging-hub',
              builder: (_, __) => const ChargingHubScreen(),
              routes: [
                GoRoute(path: 'scan', name: 'qr-scan', builder: (_, __) => const QRScanScreen()),
                GoRoute(
                  path: 'session/new', name: 'charging-new',
                  builder: (_, state) {
                    final extra = state.extra as Map<String, String>? ?? {};
                    return ActiveSessionScreen(sessionId: 'new',
                        bookingId: extra['bookingId'], qrToken: extra['qrToken']);
                  },
                ),
                GoRoute(
                  path: 'session/:id', name: 'active-session',
                  builder: (_, state) => ActiveSessionScreen(sessionId: state.pathParameters['id']!),
                  routes: [
                    GoRoute(
                      path: 'summary', name: 'session-summary',
                      builder: (_, state) {
                        final session = state.extra as ChargingSessionEntity?;
                        if (session != null) return SessionSummaryScreen(session: session);
                        return const _LoadingScreen(label: 'Tóm tắt phiên sạc');
                      },
                    ),
                  ],
                ),
              ],
            ),
          ]),

          // Tab 3: Ví
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/wallet', name: 'wallet-dashboard',
              builder: (_, __) => const WalletDashboardScreen(),
              routes: [
                GoRoute(
                  path: 'topup/processing', name: 'vnpay-processing',
                  builder: (_, state) => VNPayProcessingScreen(
                    txnRef:       state.uri.queryParameters['vnp_TxnRef'],
                    responseCode: state.uri.queryParameters['vnp_ResponseCode'],
                  ),
                ),
              ],
            ),
          ]),

          // Tab 4: Hồ sơ
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/profile', name: 'profile',
              builder: (_, __) => const ProfileScreen(),
              routes: [
                GoRoute(path: 'vehicles', name: 'vehicles', builder: (_, __) => const VehiclesScreen()),
                GoRoute(path: 'security', name: 'security-settings', builder: (_, __) => const SecuritySettingsScreen()),
              ],
            ),
            GoRoute(path: '/notifications', name: 'notifications', builder: (_, __) => const NotificationsScreen()),
          ]),
        ],
      ),
    ],
  );
}

/// Shell Scaffold — BottomNavigationBar 5-tab
class _AppScaffold extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const _AppScaffold({required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthUnauthenticated) GoRouter.of(context).go('/auth/login');
      },
      child: Scaffold(
        body: navigationShell,
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: navigationShell.currentIndex,
          onTap: (i) => navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.map_outlined),                   activeIcon: Icon(Icons.map),                   label: 'Bản đồ'),
            BottomNavigationBarItem(icon: Icon(Icons.event_outlined),                 activeIcon: Icon(Icons.event),                 label: 'Đặt lịch'),
            BottomNavigationBarItem(icon: Icon(Icons.bolt_outlined),                  activeIcon: Icon(Icons.bolt),                  label: 'Sạc điện'),
            BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), activeIcon: Icon(Icons.account_balance_wallet), label: 'Ví'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outlined),                activeIcon: Icon(Icons.person),                label: 'Hồ sơ'),
          ],
        ),
      ),
    );
  }
}

/// RefreshListenable để router phản ứng với AuthBloc
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.listen((_) => notifyListeners());
  }
  late final dynamic _subscription;
  @override
  void dispose() { (_subscription as dynamic).cancel(); super.dispose(); }
}

class _LoadingScreen extends StatelessWidget {
  final String label;
  const _LoadingScreen({required this.label});
  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: Text(label)), body: const Center(child: CircularProgressIndicator()));
}
