import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * Shared Swagger setup helper — Used by all microservices.
 *
 * Enabled only when NODE_ENV !== 'production' or SWAGGER_ENABLED=true.
 * - In production Docker environments, Swagger is disabled to save resources.
 * - In development (npm run start:dev), Swagger is always active.
 *
 * Access URL: http://localhost:{PORT}/api/docs
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
  // Necessary for visibility in local development logs.
  console.log(
    `Swagger UI: http://localhost:${config.port}/api/docs`,
  );
}
