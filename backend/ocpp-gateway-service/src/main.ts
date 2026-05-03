import './tracing'; // OpenTelemetry MUST be first (Item 4.4)
import 'reflect-metadata';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const SERVICE_NAME = 'ocpp-gateway-service';
const DEFAULT_PORT = 3010;

async function bootstrap() {
  // Do NOT use bufferLogs — it can hang if pino logger init fails
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  // Graceful Shutdown (Item 4.2)
  app.enableShutdownHooks();

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Trace-ID'],
  });

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Health Endpoint (no prefix)
  app.getHttpAdapter().get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', service: SERVICE_NAME, timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT ?? DEFAULT_PORT;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(
    `[${SERVICE_NAME}] Running on :${port}`,
  );
}

bootstrap().catch((err) => { console.error('[FATAL]', err); process.exit(1); });

