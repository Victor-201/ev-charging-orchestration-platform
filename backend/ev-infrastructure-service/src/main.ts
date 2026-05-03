import './tracing'; // OpenTelemetry MUST be first (Item 4.4)
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const SERVICE_NAME = 'station-service';
const DEFAULT_PORT = 3003;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

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

  // Swagger (Item 4.1)
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const port = Number(process.env.PORT ?? DEFAULT_PORT);
    const config = new DocumentBuilder()
      .setTitle('Station Service API')
      .setDescription('Quan ly tram sac, tru sac, ban do')
      .setVersion('1.0')
      .addTag('Stations')
      .addTag('Chargers')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
      .addServer(`http://localhost:${port}`, 'Local Dev')
      .addServer('http://localhost:8000', 'Kong Gateway')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config), {
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    });
  }

  // Health Endpoint
  app.getHttpAdapter().get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', service: SERVICE_NAME, timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT ?? DEFAULT_PORT;
  await app.listen(port);
  app.get(Logger).log(`[${SERVICE_NAME}] Running on :${port} | Swagger: /api/docs`);
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
