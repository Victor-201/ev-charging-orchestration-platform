import { Controller, Get } from '@nestjs/common';
import { ClickHouseTelemetryService } from '../../application/use-cases/clickhouse-telemetry.service';

@Controller('health')
export class HealthController {
  constructor(private readonly clickhouse: ClickHouseTelemetryService) {}

  @Get()
  check() {
    const chStatus = this.clickhouse.getConnectionStatus();
    return {
      status:    'healthy',
      service:   'telemetry-ingestion-service',
      timestamp: new Date(),
      dependencies: {
        clickhouse: {
          status:    chStatus.connected ? 'connected' : 'disconnected',
          database:  chStatus.database,
          buffered:  chStatus.bufferedRows,
        },
      },
    };
  }
}
