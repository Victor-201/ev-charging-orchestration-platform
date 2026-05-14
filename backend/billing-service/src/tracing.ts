/**
 * OpenTelemetry Distributed Tracing Bootstrap (Item 4.4)
 *
 * MUST be imported BEFORE reflect-metadata in main.ts:
 *   import './tracing';
 *   import 'reflect-metadata';
 *
 * Environment Variables:
 *   OTEL_ENABLED=true           — Enables tracing (default: false in development)
 *   OTEL_SERVICE_NAME           — Service identifier
 *   OTEL_EXPORTER_OTLP_ENDPOINT — OTLP collector endpoint (default: http://localhost:4318)
 *
 * View traces at: http://localhost:16686 (Jaeger UI if configured)
 */

// Only initializes if explicitly enabled — prevents performance overhead during development/testing.
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
