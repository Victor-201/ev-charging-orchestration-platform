import {
  Controller, Post, Body, Param, HttpCode, HttpStatus,
  ParseUUIDPipe, BadRequestException, Logger,
} from '@nestjs/common';
import { IngestTelemetryUseCase } from '../../application/use-cases/ingest-telemetry.use-case';

import { IsString, IsNumber, IsOptional } from 'class-validator';

class TelemetryDto {
  @IsString()
  chargerId!:    string;
  @IsString()
  sessionId!:    string;
  @IsNumber() @IsOptional()
  powerKw?:      number;
  @IsNumber() @IsOptional()
  currentA?:     number;
  @IsNumber() @IsOptional()
  voltageV?:     number;
  @IsNumber() @IsOptional()
  meterWh?:      number;
  @IsNumber() @IsOptional()
  socPercent?:   number;
  @IsNumber() @IsOptional()
  temperatureC?: number;
  @IsString() @IsOptional()
  errorCode?:    string;
  @IsString() @IsOptional()
  hardwareTimestamp?: string;
}

/**
 * TelemetryController - Scope HTTP Ingestion endpoint
 *
 * POST /api/v1/telemetry/ingest
 *   - Receives telemetry from charger hardware / MQTT bridge
 *   - Validates & normalizes reading
 *   - Buffers and publishes to RabbitMQ ev.telemetry exchange
 *
 * POST /api/v1/telemetry/ingest/:chargerId/:sessionId (convenience)
 *   - Same as above, chargerId/sessionId from path
 *
 * This endpoint is called by:
 *   - Charger firmware (via MQTT bridge → HTTP)
 *   - Staff tool (manual reading entry)
 */
@Controller('telemetry')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly ingest: IngestTelemetryUseCase) {}

  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestReading(@Body() dto: TelemetryDto) {
    if (!dto.chargerId || !dto.sessionId) {
      throw new BadRequestException('chargerId and sessionId are required');
    }
    const result = await this.ingest.execute(dto);
    if (!result.accepted) {
      throw new BadRequestException({
        message: 'Telemetry reading rejected',
        errors:  result.errors,
      });
    }
    return { eventId: result.eventId, warnings: result.errors };
  }

  @Post('ingest/:chargerId/:sessionId')
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestByPath(
    @Param('chargerId', ParseUUIDPipe) chargerId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: Omit<TelemetryDto, 'chargerId' | 'sessionId'>,
  ) {
    const result = await this.ingest.execute({ ...dto, chargerId, sessionId });
    if (!result.accepted) {
      throw new BadRequestException({ message: 'Rejected', errors: result.errors });
    }
    return { eventId: result.eventId, warnings: result.errors };
  }
}
