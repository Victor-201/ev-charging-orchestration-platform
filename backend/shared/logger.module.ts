import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';

/**
 * Shared Pino Logger Module
 *
 * Provides structured JSON logging for the entire platform.
 * Each request automatically receives a unique X-Request-ID attached to
 * all related log lines — supporting distributed tracing.
 *
 * Development: Logs are printed in a human-readable, colorized format (pino-pretty).
 * Production: Logs are output as raw JSON for ingestion by ELK Stack / Datadog.
 *
 * Usage:
 *   imports: [SharedLoggerModule]
 *   constructor(private readonly logger: PinoLogger) {}
 */
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize:        true,
                singleLine:      true,
                levelFirst:      false,
                translateTime:   'HH:MM:ss.l',
                ignore:          'pid,hostname',
                messageFormat:   '{msg} {req.method} {req.url}',
              },
            }
          : undefined,
        serializers: {
          req(req: any) {
            return {
              id:        req.id,
              method:    req.method,
              url:       req.url,
              userAgent: req.headers['user-agent'],
              ip:        req.remoteAddress,
            };
          },
          res(res: any) {
            return { statusCode: res.statusCode };
          },
        },
        // Attach X-Request-ID to every request automatically
        genReqId: (req: any) => {
          const existing = req.headers['x-request-id'];
          if (existing) return existing;
          const id = uuidv4();
          req.headers['x-request-id'] = id;
          return id;
        },
        // Add X-Request-ID to response headers
        customReceivedMessage: (req: any) =>
          `-> ${req.method} ${req.url}`,
        customSuccessMessage: (req: any, res: any) =>
          `<- ${req.method} ${req.url} ${res.statusCode}`,
        customErrorMessage: (req: any, res: any, err: Error) =>
          `[ERROR] ${req.method} ${req.url} ${res.statusCode}: ${err.message}`,
        // Skip logging for /health endpoints to reduce noise
        autoLogging: {
          ignore: (req: any) => req.url?.includes('/health'),
        },
        // Add service name to every log line
        base: {
          service: process.env.npm_package_name ?? 'ev-service',
          env:     process.env.NODE_ENV ?? 'development',
        },
        // Redact sensitive information from logs
        redact: {
          paths:  ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
          censor: '[REDACTED]',
        },
      },
    }),
  ],
  exports: [LoggerModule],
})
export class SharedLoggerModule {}
