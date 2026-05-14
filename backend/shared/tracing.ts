/**
 * OpenTelemetry Distributed Tracing Bootstrap
 *
 * MUST be imported BEFORE reflect-metadata in main.ts:
 *   import './tracing';
 *   import 'reflect-metadata';
 *
 * Environment Variables:
 *   OTEL_ENABLED=true           — Enable tracing (default: false in dev)
 *   OTEL_SERVICE_NAME           — Service name identifier
 *   OTEL_EXPORTER_OTLP_ENDPOINT — OTLP collector URL (default: http://localhost:4318)
 *
 * Trace visualization: http://localhost:16686 (Jaeger UI)
 */

// Only initialize if explicitly enabled — avoids overhead in dev/test
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
        // Use direct string keys for compatibility across OTel versions
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
              // Skip health checks to reduce noise
              ignoreIncomingRequestHook: (req: any): boolean =>
                Boolean(req.url?.includes('/health')),
            },
            // Disable fs instrumentation — too much noise
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ],
      });

      sdk.start();

      // Flush and shutdown when the process terminates (Graceful Shutdown)
      process.on('SIGTERM', async () => {
        try {
          await sdk.shutdown();
        } catch (err) {
          console.error('[OTel] Error shutting down tracing', err);
        }
      });

      console.log(`[OTel] Distributed Tracing enabled: ${serviceName} → ${endpoint}`);
    } catch (err) {
      // Do not crash the app if OTel fails
      console.warn('[OTel] Failed to initialize tracing:', err);
    }
  })();
}
