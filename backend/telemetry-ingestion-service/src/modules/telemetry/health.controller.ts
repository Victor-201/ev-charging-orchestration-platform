import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'healthy', service: 'telemetry-ingestion-service', timestamp: new Date() };
  }
}
