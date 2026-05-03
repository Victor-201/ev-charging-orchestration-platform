import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * Shared Swagger setup helper — dùng chung cho tất cả 10 microservices.
 *
 * Chỉ bật khi NODE_ENV !== 'production' hoặc SWAGGER_ENABLED=true
 * → Trong Docker production, Swagger sẽ không chạy để tiết kiệm tài nguyên.
 * → Trong development (npm run start:dev), Swagger luôn bật.
 *
 * Truy cập: http://localhost:{PORT}/api/docs
 */
export function setupSwagger(
  app: INestApplication,
  config: {
    title: string;
    description: string;
    version?: string;
    tag?: string;
    port: number | string;
  },
): void {
  const enabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';

  if (!enabled) return;

  const doc = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version ?? '1.0')
    .addTag(config.tag ?? config.title)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'jwt-auth',
    )
    .addServer(`http://localhost:${config.port}`, 'Local Dev')
    .addServer('http://localhost:8000', 'Kong Gateway (Production)')
    .build();

  const document = SwaggerModule.createDocument(app, doc);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
    },
    customSiteTitle: `${config.title} — EV Platform API Docs`,
  });

  // eslint-disable-next-line no-console
  console.log(
    `📖 Swagger UI: http://localhost:${config.port}/api/docs`,
  );
}
