/**
 * OpenTelemetry Distributed Tracing Bootstrap
 *
 * MUST be imported BEFORE reflect-metadata in main.ts:
 *   import './tracing';
 *   import 'reflect-metadata';
 *
 * Environment Variables:
 *   OTEL_ENABLED=true           — Enables tracing (defaults to false in development).
 *   OTEL_SERVICE_NAME           — Service name.
 *   OTEL_EXPORTER_OTLP_ENDPOINT — Collector URL (default: http://localhost:4318).
 *
 * View traces at: http://localhost:16686 (Jaeger UI if available).
 */

// Only initializes when explicitly enabled to avoid overhead during development/testing.
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
        // Uses string keys directly for compatibility across OpenTelemetry versions.
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
              // Ignore health checks to reduce noise.
              ignoreIncomingRequestHook: (req: any): boolean =>
                Boolean(req.url?.includes('/health')),
            },
            // Disable fs instrumentation — excessive noise.
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ],
      });

      sdk.start();

      // Flush and shutdown upon process termination (Graceful Shutdown).
      process.on('SIGTERM', async () => {
        try {
          await sdk.shutdown();
        } catch (err) {
          console.error('[OTel] Error shutting down tracing', err);
        }
      });

      console.log(`[OTel] Distributed Tracing enabled: ${serviceName} → ${endpoint}`);
    } catch (err) {
      // Ensures the application does not crash if OpenTelemetry initialization fails.
      console.warn('[OTel] Failed to initialize tracing:', err);
    }
  })();
}
