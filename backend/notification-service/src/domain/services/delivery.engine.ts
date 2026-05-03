import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Notification, NotificationChannel, NotificationType } from '../../domain/entities/notification.aggregate';
import { NotificationPreference } from '../../domain/entities/notification.aggregate';
import {
  NotificationOrmEntity,
  NotificationPreferenceOrmEntity,
  ProcessedEventOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/notification.orm-entities';
import { NotificationGateway } from '../../infrastructure/realtime/notification.gateway';
import { FcmPushService } from '../../infrastructure/push/fcm-push.service';
import { NOTIFICATION_TEMPLATES } from '../../domain/events/notification.events';

/**
 * DeliveryEngine — Multi-channel Notification Dispatcher
 *
 * Flow:
 *   Event Payload
 *     → create Notification domain object
 *     → persist to DB (notifications table)
 *     → load user preferences
 *     → dispatch to channels:
 *         ① enableRealtime → Socket.IO emit
 *         ② enablePush     → FCM (với quiet hours check)
 *         ③ enableEmail    → Email stub (không block)
 *
 * Design decisions:
 * - Persist trước → realtime sau (client có thể lấy lại nếu miss realtime)
 * - Channel dispatch không throw → log error, tiếp tục
 * - Duplicate guard: eventId trong processed_events (ở consumer level)
 */
@Injectable()
export class DeliveryEngine {
  private readonly logger = new Logger(DeliveryEngine.name);

  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly notifRepo: Repository<NotificationOrmEntity>,
    @InjectRepository(NotificationPreferenceOrmEntity)
    private readonly prefRepo: Repository<NotificationPreferenceOrmEntity>,
    private readonly gateway:   NotificationGateway,
    private readonly fcm:       FcmPushService,
  ) {}

  /**
   * Dispatch notification cho một user.
   * Idempotency guard phải được thực hiện ở tầng consumer trước khi gọi method này.
   */
  async dispatch(params: {
    userId:    string;
    type:      NotificationType;
    channels:  NotificationChannel[];
    title:     string;
    body:      string;
    metadata?: Record<string, any>;
    // Optional structured payloads cho specific realtime events
    realtimePayload?: {
      bookingUpdate?:  object;
      queueUpdate?:    object;
      chargingUpdate?: object;
    };
  }): Promise<Notification> {

    // ── 1. Tạo domain aggregate ──────────────────────────────────────────────
    const notification = Notification.create({
      userId:   params.userId,
      type:     params.type,
      channel:  params.channels[0],  // primary channel
      title:    params.title,
      body:     params.body,
      metadata: params.metadata ?? {},
    });

    // ── 2. Persist ───────────────────────────────────────────────────────────
    await this.notifRepo.save(
      this.notifRepo.create({
        id:       notification.id,
        userId:   notification.userId,
        type:     notification.type,
        channel:  notification.channel,
        title:    notification.title,
        body:     notification.body,
        status:   'sent',
        metadata: notification.metadata,
        readAt:   null,
      }),
    );

    // ── 3. Load preferences ──────────────────────────────────────────────────
    const prefRow = await this.prefRepo.findOneBy({ userId: params.userId });
    const pref = prefRow
      ? NotificationPreference.reconstitute({
          userId:          prefRow.userId,
          enablePush:      prefRow.enablePush,
          enableRealtime:  prefRow.enableRealtime,
          enableEmail:     prefRow.enableEmail,
          enableSms:       prefRow.enableSms,
          quietHoursStart: prefRow.quietHoursStart,
          quietHoursEnd:   prefRow.quietHoursEnd,
          updatedAt:       prefRow.updatedAt,
        })
      : NotificationPreference.createDefault(params.userId);

    // ── 4. Dispatch to channels ──────────────────────────────────────────────

    const dispatches: Promise<void>[] = [];

    // Channel: Realtime (Socket.IO)
    if (params.channels.includes('in_app') && pref.enableRealtime) {
      dispatches.push(this.dispatchRealtime(notification, params.realtimePayload));
    }

    // Channel: Push (FCM)
    if (params.channels.includes('push') && pref.canSendPushNow()) {
      dispatches.push(this.dispatchPush(notification));
    }

    // Channel: Email stub
    if (params.channels.includes('email') && pref.enableEmail) {
      dispatches.push(this.dispatchEmailStub(notification));
    }

    // Fire all channels in parallel — không block on individual failures
    await Promise.allSettled(dispatches);

    this.logger.log(
      `Dispatched ${params.type} → user=${params.userId} channels=[${params.channels.join(',')}]`,
    );

    return notification;
  }

  // ─── Channel Dispatch Implementations ────────────────────────────────────

  private async dispatchRealtime(
    notification: Notification,
    realtimePayload?: {
      bookingUpdate?:  object;
      queueUpdate?:    object;
      chargingUpdate?: object;
    },
  ): Promise<void> {
    try {
      // Always emit generic 'notification' event
      this.gateway.emitToUser(notification.userId, {
        id:        notification.id,
        type:      notification.type,
        title:     notification.title,
        body:      notification.body,
        metadata:  notification.metadata,
        createdAt: notification.createdAt,
      });

      // Emit type-specific events for client-side routing
      if (realtimePayload?.bookingUpdate) {
        this.gateway.emitBookingUpdate(notification.userId, realtimePayload.bookingUpdate as any);
      }
      if (realtimePayload?.queueUpdate) {
        this.gateway.emitQueueUpdate(notification.userId, realtimePayload.queueUpdate as any);
      }
      if (realtimePayload?.chargingUpdate) {
        this.gateway.emitChargingUpdate(notification.userId, realtimePayload.chargingUpdate as any);
      }
    } catch (err: any) {
      this.logger.error(`Realtime dispatch failed: ${err.message}`);
    }
  }

  private async dispatchPush(notification: Notification): Promise<void> {
    try {
      await this.fcm.sendToUser({
        userId: notification.userId,
        title:  notification.title,
        body:   notification.body,
        data:   {
          notificationId: notification.id,
          type:           notification.type,
          ...this.serializeMetadataForFcm(notification.metadata),
        },
      });
    } catch (err: any) {
      this.logger.error(`Push dispatch failed: ${err.message}`);
    }
  }

  private async dispatchEmailStub(notification: Notification): Promise<void> {
    // STUB: Email delivery via nodemailer/SMTP.
    // Production: integrate với email-service hoặc AWS SES.
    this.logger.log(
      `[EMAIL STUB] Would send email to user=${notification.userId} subject="${notification.title}"`,
    );
  }

  /** FCM data payload chỉ chấp nhận Record<string, string> */
  private serializeMetadataForFcm(metadata: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(metadata)) {
      result[k] = String(v);
    }
    return result;
  }

  // ─── Idempotency Helper (dùng ở consumer) ────────────────────────────────

  async isProcessed(
    eventId: string,
    repo: Repository<ProcessedEventOrmEntity>,
  ): Promise<boolean> {
    return repo.existsBy({ event_id: eventId });
  }

  async markProcessed(
    eventId: string,
    eventType: string,
    repo: Repository<ProcessedEventOrmEntity>,
  ): Promise<void> {
    await repo.save({ event_id: eventId, eventType });
  }
}
