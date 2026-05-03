import { Controller, Get } from '@nestjs/common';
import { OcppGatewayService } from '../ocpp/ocpp-gateway.service';

@Controller('ocpp/health')
export class HealthController {
  constructor(private readonly gateway: OcppGatewayService) {}

  @Get()
  check() {
    const chargers = this.gateway.getConnectedChargers();
    return {
      status:            'ok',
      service:           'ocpp-gateway-service',
      connectedChargers: chargers.length,
      chargers:          chargers.map((c) => ({
        id:            c.chargerId,
        connectedAt:   c.connectedAt.toISOString(),
        lastHeartbeat: c.lastHeartbeat.toISOString(),
      })),
    };
  }
}
