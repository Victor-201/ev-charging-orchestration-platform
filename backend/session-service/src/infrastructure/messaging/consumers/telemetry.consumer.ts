import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaultDetectionService } from '../../../application/use-cases/reconciliation.use-cases';
import {
  TelemetryOrmEntity,
  ProcessedEventOrmEntity,
} from '../../persistence/typeorm/entities/session.orm-entities';
import { v4 as uuidv4 } from 'uuid';


/**
 * TelemetryConsumer - Event-based telemetry ingestion
 *
 * Listens for events from telemetry ingestion service / OCPP bridge.
 * Saves to DB and passes to FaultDetectionService.
 * Does not save directly from HTTP endpoint - event-driven pattern.
 */
@Injectable()
export class TelemetryConsumer {
  private readonly logger = new Logger(TelemetryConsumer.name);

  constructor(
    @InjectRepository(TelemetryOrmEntity)
    private readonly telemetryRepo: Repository<TelemetryOrmEntity>,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    private readonly faultDetection: FaultDetectionService,
  ) {}

  @RabbitSubscribe({
    exchange: 'ev.charging',
    routingKey: 'telemetry.received',
    queue: 'charging-service.telemetry.received',
    queueOptions: {
      durable: true,
      arguments: { 'x-message-ttl': 300000 }, // 5min TTL
    },
  })
  async handleTelemetry(payload: {
    eventId: string;
    sessionId: string;
    chargerId: string;
    powerKw: number;
    currentA: number;
    voltageV: number;
    socPercent?: number;
    errorCode?: string;
    timestamp: string;
  }): Promise<void> {
    // Idempotency check
    const processed = await this.processedRepo.findOne({
      where: { eventId: payload.eventId },
    });
    if (processed) {
      this.logger.debug(`Telemetry ${payload.eventId} already processed`);
      return;
    }

    try {
      // Persist telemetry reading
      await this.telemetryRepo.save({
        id:           uuidv4(),
        sessionId:    payload.sessionId,
        chargerId:    payload.chargerId,
        powerKw:      payload.powerKw,
        currentA:     payload.currentA,
        voltageV:     payload.voltageV,
        socPercent:   payload.socPercent ?? null,
        errorCode:    payload.errorCode ?? null,
        recordedAt:   new Date(payload.timestamp),
      });

      // Analyze for faults
      await this.faultDetection.analyze({
        chargerId:  payload.chargerId,
        sessionId:  payload.sessionId,
        powerKw:    payload.powerKw,
        currentA:   payload.currentA,
        voltageV:   payload.voltageV,
        errorCode:  payload.errorCode,
        timestamp:  new Date(payload.timestamp),
      });

      // Mark as processed
      await this.processedRepo.save({
        eventId:   payload.eventId,
        eventType: 'telemetry.received',
      });

      this.logger.debug(
        `Telemetry processed: charger=${payload.chargerId} power=${payload.powerKw}kW`,
      );
    } catch (err) {
      this.logger.error(`Telemetry processing failed: ${err}`);
      throw err; // NACK → RabbitMQ retry
    }
  }
}
