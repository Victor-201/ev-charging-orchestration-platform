// OpenTelemetry initialization must precede other imports for proper instrumentation.
import './tracing';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const SERVICE_NAME = 'telemetry-ingestion-service';
const DEFAULT_PORT = 3009;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Enable graceful shutdown hooks for container orchestration.
  app.enableShutdownHooks();

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Trace-ID'],
  });

  app.setGlobalPrefix('api/v1');

  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const port = Number(process.env.PORT ?? DEFAULT_PORT);
    const config = new DocumentBuilder()
      .setTitle('Telemetry Service API')
      .setDescription('High-throughput ingestion and processing of physical charger telemetry data.')
      .setVersion('1.0')
      .addTag('Telemetry')
      .addTag('MeterValues')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
      .addServer(`http://localhost:${port}`, 'Local Dev')
      .addServer('http://localhost:8000', 'Kong Gateway')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config), {
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    });
  }

  app.getHttpAdapter().get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', service: SERVICE_NAME, timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT ?? DEFAULT_PORT;
  await app.listen(port);
  new Logger('Bootstrap').log(
    `[${SERVICE_NAME}] Running on :${port} | Swagger: /api/docs`
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

