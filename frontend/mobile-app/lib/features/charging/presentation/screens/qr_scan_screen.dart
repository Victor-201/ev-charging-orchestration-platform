import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../core/design_system/app_colors.dart';
import '../../../../core/design_system/app_typography.dart';
import '../../../../core/utils/qr_validator.dart';

/// Màn hình quét QR — S-10
/// Sử dụng mobile_scanner với QrValidator (window: startTime-15m → endTime+5m)
class QRScanScreen extends StatefulWidget {
  const QRScanScreen({super.key});

  @override
  State<QRScanScreen> createState() => _QRScanScreenState();
}

class _QRScanScreenState extends State<QRScanScreen>
    with SingleTickerProviderStateMixin {
  final MobileScannerController _cameraController =
      MobileScannerController();
  bool _scanned = false;
  late AnimationController _scanAnimController;
  late Animation<double> _scanAnimation;

  @override
  void initState() {
    super.initState();
    _scanAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _scanAnimation = Tween<double>(begin: 0, end: 240).animate(
      CurvedAnimation(
          parent: _scanAnimController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _scanAnimController.dispose();
    super.dispose();
  }

  void _onBarcodeDetected(BarcodeCapture capture) {
    if (_scanned) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null) return;

    // Validate QR format
    if (!QrValidator.isValidFormat(code)) {
      _showError('Mã QR không đúng định dạng EV-XXXXXXXX-XXXXXXXXXXXXXXXX');
      return;
    }

    setState(() => _scanned = true);
    _cameraController.stop();
    // Extract bookingId from QR: EV-{bookingId}-{random}
    final parts = code.split('-');
    final bookingId = parts.length >= 2 ? parts[1] : code;
    _showSuccessAndNavigate(code, bookingId);
  }

  void _showSuccessAndNavigate(String qrToken, String bookingId) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Quét QR thành công! Đang khởi động phiên sạc...'),
        backgroundColor: AppColors.primary,
        duration: Duration(seconds: 2),
      ),
    );
    // Chuyển đến màn hình active session với bookingId + qrToken
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        context.go('/charging/session/new',
            extra: {'bookingId': bookingId, 'qrToken': qrToken});
      }
    });
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
      ),
    );
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _scanned = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Quét QR để sạc'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: ValueListenableBuilder<MobileScannerState>(
              valueListenable: _cameraController,
              builder: (_, state, __) => Icon(
                state.torchState == TorchState.on
                    ? Icons.flash_on
                    : Icons.flash_off,
                color: Colors.white,
              ),
            ),
            onPressed: _cameraController.toggleTorch,
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera view
          MobileScanner(
            controller: _cameraController,
            onDetect: _onBarcodeDetected,
          ),

          // Overlay tối
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withValues(alpha: 0.4),
              BlendMode.srcOut,
            ),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                // Vùng quét trong suốt
                Center(
                  child: Container(
                    width: 260,
                    height: 260,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Khung và đường quét animation
          Center(
            child: SizedBox(
              width: 260,
              height: 260,
              child: Stack(
                children: [
                  // Góc khung
                  ..._buildCorners(),
                  // Đường quét
                  AnimatedBuilder(
                    animation: _scanAnimation,
                    builder: (_, __) => Positioned(
                      top: _scanAnimation.value,
                      left: 0,
                      right: 0,
                      child: Container(
                        height: 2,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              AppColors.secondary,
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Hướng dẫn
          Positioned(
            bottom: 100,
            left: 0,
            right: 0,
            child: Text(
              'Đặt mã QR vào trong khung để sạc',
              style: AppTypography.bodyMd.copyWith(
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCorners() {
    const size = 24.0;
    const strokeWidth = 3.0;
    const color = AppColors.secondary;

    return [
      // Góc trên trái
      Positioned(
        top: 0,
        left: 0,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: color, width: strokeWidth),
              left: BorderSide(color: color, width: strokeWidth),
            ),
          ),
        ),
      ),
      // Góc trên phải
      Positioned(
        top: 0,
        right: 0,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: color, width: strokeWidth),
              right: BorderSide(color: color, width: strokeWidth),
            ),
          ),
        ),
      ),
      // Góc dưới trái
      Positioned(
        bottom: 0,
        left: 0,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: color, width: strokeWidth),
              left: BorderSide(color: color, width: strokeWidth),
            ),
          ),
        ),
      ),
      // Góc dưới phải
      Positioned(
        bottom: 0,
        right: 0,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: color, width: strokeWidth),
              right: BorderSide(color: color, width: strokeWidth),
            ),
          ),
        ),
      ),
    ];
  }
}
