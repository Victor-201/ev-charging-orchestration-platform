import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import {
  SessionOrmEntity,
  OutboxOrmEntity,
  ProcessedEventOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/session.orm-entities';
import { EntityManager } from 'typeorm';

function buildOutboxEntry(
  mgr: EntityManager,
  event: { eventType: string; [k: string]: any },
  aggregateId: string,
): OutboxOrmEntity {
  return mgr.create(OutboxOrmEntity, {
    id:            uuidv4(),
    aggregateType: 'session',
    aggregateId,
    eventType:     event.eventType,
    payload:       { ...event } as object,
    status:        'pending',
    publishedAt:   null,
  });
}

/**
 * LateDeliveryReconciler - Task 5.2 Offline Resilience
 *
 * Problem: Chargers in apartment basements often lose 4G.
 * When network returns, charger sends batched MeterValues with
 * `hardwareTimestamp` that might be minutes or hours old.
 *
 * Solution:
 * 1. Consumer receives `telemetry.late_delivery` (detected by OCPP Gateway
 *    when batch timestamp < server timestamp - LATE_THRESHOLD)
 * 2. Find session by chargerId + time
 * 3. Update `end_meter_wh` based on accurate hardware data
 * 4. If session is BILLED and there's a discrepancy -> publish invoice adjustment
 *
 * Important rules:
 * - Always use `hardware_timestamp` as time source, not `received_at`
 * - Only patch invoice if delta > 0.1 kWh (avoid noise)
 */
@Injectable()
export class LateDeliveryReconciler {
  private readonly logger = new Logger(LateDeliveryReconciler.name);

  /** Minimum kWh delta threshold to create invoice adjustment */
  private readonly MIN_DELTA_KWH = 0.1;

  constructor(
    @InjectRepository(SessionOrmEntity)
    private readonly sessionRepo: Repository<SessionOrmEntity>,
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly ds: DataSource,
  ) {}

  /**
   * Consume regular telemetry event but with old hardwareTimestamp.
   * OCPP Gateway always attaches hardwareTimestamp to all telemetry events.
   * If hardwareTimestamp is older than received_at > 5 minutes -> need to reconcile.
   */
  @RabbitSubscribe({
    exchange:     'ev.telemetry',
    routingKey:   'telemetry.ingested',
    queue:        'charging-svc.late-telemetry-reconcile',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'ev.charging.dlx',
    },
  })
  async handleTelemetry(payload: {
    eventId:            string;
    chargerId:          string;
    sessionId:          string;
    meterWh?:           number;
    hardwareTimestamp?: string;
    publishedAt:        string;
  }): Promise<void> {
    // If no hardware timestamp -> no need to reconcile
    if (!payload.hardwareTimestamp || !payload.meterWh) return;

    const hwTime      = new Date(payload.hardwareTimestamp).getTime();
    const receivedAt  = new Date(payload.publishedAt).getTime();
    const delayMs     = receivedAt - hwTime;

    // Only reconcile if delayed > 5 minutes
    const LATE_THRESHOLD_MS = 5 * 60_000;
    if (delayMs < LATE_THRESHOLD_MS) return;

    this.logger.warn(
      `Late telemetry detected: charger=${payload.chargerId} ` +
      `delay=${Math.round(delayMs / 60_000)}min hwTs=${payload.hardwareTimestamp}`,
    );

    // Idempotency
    const eventId = `late-recon-${payload.eventId}`;
    if (await this.peRepo.existsBy({ eventId })) return;

    await this.ds.transaction(async (mgr) => {
      // Find active or stopped session at the hardware timestamp
      const session = await mgr
        .createQueryBuilder(SessionOrmEntity, 's')
        .where('s.charger_id = :chargerId', { chargerId: payload.chargerId })
        .andWhere('s.start_time <= :hwTime', { hwTime: new Date(payload.hardwareTimestamp!) })
        .andWhere('(s.end_time IS NULL OR s.end_time >= :hwTime)', {
          hwTime: new Date(payload.hardwareTimestamp!),
        })
        .getOne();

      if (!session) {
        this.logger.debug(
          `No session found for late telemetry at ${payload.hardwareTimestamp} on charger=${payload.chargerId}`,
        );
        return;
      }

      // Update end_meter_wh if new value is larger (prevent rollback)
      const currentEndMeter = session.endMeterWh ? Number(session.endMeterWh) : null;
      if (currentEndMeter !== null && payload.meterWh! <= currentEndMeter) {
        // Old data, no update needed
        return;
      }

      // Calculate kWh difference if session is billed
      if (session.status === 'billed' && currentEndMeter !== null) {
        const oldKwh  = (currentEndMeter - Number(session.startMeterWh)) / 1000;
        const newKwh  = (payload.meterWh! - Number(session.startMeterWh)) / 1000;
        const deltaKwh = Math.abs(newKwh - oldKwh);

        if (deltaKwh >= this.MIN_DELTA_KWH) {
          // Publish invoice adjustment event
          const adjustEvent = {
            eventType:    'session.invoice.adjustment_required',
            sessionId:    session.id,
            userId:       session.userId,
            oldKwh,
            newKwh,
            deltaKwh,
            reason:       'late_meter_delivery',
            adjustedAt:   new Date().toISOString(),
          };
          await mgr.save(buildOutboxEntry(mgr, adjustEvent, session.id));

          this.logger.warn(
            `Invoice adjustment: session=${session.id} ` +
            `delta=${deltaKwh.toFixed(3)}kWh old=${oldKwh.toFixed(3)} new=${newKwh.toFixed(3)}`,
          );
        }
      }

      // Update end_meter_wh with more accurate hardware value
      await mgr.query(
        `UPDATE charging_sessions SET end_meter_wh = $1 WHERE id = $2`,
        [payload.meterWh, session.id],
      );

      // Idempotency
      await mgr.save(ProcessedEventOrmEntity, {
        eventId,
        eventType:   'telemetry.late_reconcile',
        processedAt: new Date(),
      });

      this.logger.log(
        `Late telemetry reconciled: session=${session.id} ` +
        `new_end_meter=${payload.meterWh}Wh (hw_ts=${payload.hardwareTimestamp})`,
      );
    });
  }
}
