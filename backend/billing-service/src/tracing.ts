/**
 * OpenTelemetry Distributed Tracing Bootstrap (Item 4.4)
 *
 * PHẢI được import TRƯỚC reflect-metadata trong main.ts:
 *   import './tracing';
 *   import 'reflect-metadata';
 *
 * Biến môi trường:
 *   OTEL_ENABLED=true           — Bật tracing (default false khi dev)
 *   OTEL_SERVICE_NAME           — Tên service
 *   OTEL_EXPORTER_OTLP_ENDPOINT — URL collector (default: http://localhost:4318)
 *
 * Xem trace tại: http://localhost:16686 (Jaeger UI nếu có)
 */

// Chỉ khởi động khi được bật tường minh — tránh overhead khi dev/test
if (process.env.OTEL_ENABLED === 'true') {
  void (async () => {
    try {
      const { NodeSDK }                     = await import('@opentelemetry/sdk-node');
      const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
      const { OTLPTraceExporter }           = await import('@opentelemetry/exporter-trace-otlp-http');

      const serviceName = process.env.OTEL_SERVICE_NAME
        ?? process.env.npm_package_name
        ?? 'ev-service-unknown';

      const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

      const sdk = new NodeSDK({
        // Dùng string key trực tiếp để tương thích mọi phiên bản OTel
        serviceName,
        traceExporter: new OTLPTraceExporter({
          url: `${endpoint}/v1/traces`,
          headers: {
            'x-ev-service': serviceName,
          },
        }),
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {
              // Bỏ qua health check để giảm noise
              ignoreIncomingRequestHook: (req: any): boolean =>
                Boolean(req.url?.includes('/health')),
            },
            // Tắt fs instrumentation — quá nhiều noise
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ],
      });

      sdk.start();

      // Flush và shutdown khi process tắt (Graceful Shutdown)
      process.on('SIGTERM', async () => {
        try {
          await sdk.shutdown();
        } catch (err) {
          console.error('[OTel] Error shutting down tracing', err);
        }
      });

      console.log(`[OTel] Distributed Tracing enabled: ${serviceName} → ${endpoint}`);
    } catch (err) {
      // Không làm crash app nếu OTel gặp lỗi
      console.warn('[OTel] Failed to initialize tracing:', err);
    }
  })();
}
