import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';

/**
 * Shared Pino Logger Module
 *
 * Cung cấp structured JSON logging cho toàn bộ hệ thống.
 * Mỗi request tự động nhận một X-Request-ID duy nhất được gắn vào
 * tất cả dòng log liên quan — hỗ trợ Distributed Tracing phân tán.
 *
 * Development: Log được in ra màu sắc đẹp (pino-pretty).
 * Production:  Log ra JSON thuần, ELK Stack / Datadog đọc trực tiếp.
 *
 * Sử dụng:
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
        // Gắn X-Request-ID vào mỗi request tự động
        genReqId: (req: any) => {
          const existing = req.headers['x-request-id'];
          if (existing) return existing;
          const id = uuidv4();
          req.headers['x-request-id'] = id;
          return id;
        },
        // Thêm X-Request-ID vào response headers
        customReceivedMessage: (req: any) =>
          `→ ${req.method} ${req.url}`,
        customSuccessMessage: (req: any, res: any) =>
          `← ${req.method} ${req.url} ${res.statusCode}`,
        customErrorMessage: (req: any, res: any, err: Error) =>
          `✖ ${req.method} ${req.url} ${res.statusCode}: ${err.message}`,
        // Bỏ qua log cho /health (quá nhiều noise)
        autoLogging: {
          ignore: (req: any) => req.url?.includes('/health'),
        },
        // Thêm service name vào mọi dòng log
        base: {
          service: process.env.npm_package_name ?? 'ev-service',
          env:     process.env.NODE_ENV ?? 'development',
        },
        // Redact thông tin nhạy cảm
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
