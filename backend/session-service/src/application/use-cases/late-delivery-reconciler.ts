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
 * LateDeliveryReconciler — Task 5.2 Offline Resilience
 *
 * Vấn đề: Trụ sạc ở hầm chung cư thường mất 4G.
 * Khi có mạng lại, trụ gửi dồn hàng loạt MeterValues với
 * `hardwareTimestamp` có thể cũ hơn vài phút hoặc vài giờ.
 *
 * Giải pháp:
 * 1. Consumer nhận `telemetry.late_delivery` (do OCPP Gateway phát hiện
 *    khi timestamp của batch < timestamp server - LATE_THRESHOLD)
 * 2. Tìm session theo chargerId + thời gian
 * 3. Cập nhật lại `end_meter_wh` dựa trên dữ liệu phần cứng chính xác
 * 4. Nếu session đã BILLED và có chênh lệch → publish điều chỉnh hóa đơn
 *
 * Quy tắc quan trọng:
 * - Luôn dùng `hardware_timestamp` làm gốc thời gian, không dùng `received_at`
 * - Chỉ patch invoice nếu delta > 0.1 kWh (tránh nhiễu)
 */
@Injectable()
export class LateDeliveryReconciler {
  private readonly logger = new Logger(LateDeliveryReconciler.name);

  /** Ngưỡng chênh lệch kWh tối thiểu để tạo điều chỉnh hóa đơn */
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
   * Tiêu thụ sự kiện telemetry bình thường nhưng có hardwareTimestamp cũ.
   * OCPP Gateway luôn đính kèm hardwareTimestamp vào mọi telemetry event.
   * Nếu hardwareTimestamp cũ hơn received_at > 5 phút → cần reconcile.
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
    // Nếu không có hardware timestamp → không cần reconcile
    if (!payload.hardwareTimestamp || !payload.meterWh) return;

    const hwTime      = new Date(payload.hardwareTimestamp).getTime();
    const receivedAt  = new Date(payload.publishedAt).getTime();
    const delayMs     = receivedAt - hwTime;

    // Chỉ reconcile nếu bị delay > 5 phút
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
      // Tìm session đang active hoặc đã stopped tại thời điểm hardware timestamp
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

      // Cập nhật end_meter_wh nếu giá trị mới lớn hơn (tránh ghi đè lùi)
      const currentEndMeter = session.endMeterWh ? Number(session.endMeterWh) : null;
      if (currentEndMeter !== null && payload.meterWh! <= currentEndMeter) {
        // Dữ liệu cũ không cập nhật gì thêm
        return;
      }

      // Tính chênh lệch kWh nếu session đã billed
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

      // Cập nhật end_meter_wh với giá trị chính xác hơn từ phần cứng
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
