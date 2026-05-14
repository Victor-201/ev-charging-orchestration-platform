import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

import { DeliveryEngine } from '../../../domain/services/delivery.engine';
import { ProcessedEventOrmEntity } from '../../persistence/typeorm/entities/notification.orm-entities';
import { NOTIFICATION_TEMPLATES } from '../../../domain/events/notification.events';
import type {
  BookingCreatedEvent, BookingConfirmedEvent, BookingCancelledEvent,
  PaymentCompletedEvent, PaymentFailedEvent,
  SessionStartedEvent, SessionCompletedEvent,
  QueueUpdatedEvent,
  BillingIdleFeeChargedEvent, BillingExtraChargeEvent, BillingRefundIssuedEvent,
  EmailVerificationRequestedEvent,
} from '../../../domain/events/notification.events';

/**
 * DLQ_OPTS: standard queueOptions for all notification consumers.
 *
 * x-dead-letter-exchange: failed messages -> DLQ fanout exchange.
 * x-message-ttl: messages expire after 24h if not consumed -> DLQ.
 * x-delivery-limit: max 3 delivery attempts before DLQ (requires RabbitMQ Quorum Queues).
 */
function buildQueueOpts(routingKeyStr?: string) {
  const opts: any = {
    durable: true,
    deadLetterExchange: 'ev.charging.dlx',
    arguments: { 'x-message-ttl': 86400000 },
  };
  if (routingKeyStr) opts.arguments['x-dead-letter-routing-key'] = routingKeyStr;
  return opts;
}


/**
 * NotificationConsumers: Event-Driven Notification Triggers
 *
 * Each consumer:
 * 1. Idempotency check (processed_events PK lookup)
 * 2. Mark processed
 * 3. Build notification content from template registry
 * 4. Delegate to DeliveryEngine (persist + dispatch channels)
 *
 * Channels per event type:
 *   booking.created    -> in_app + push
 *   booking.confirmed  -> in_app + push (booking_update realtime)
 *   booking.cancelled  -> in_app + push (booking_update realtime)
 *   payment.completed  -> push + in_app
 *   payment.failed     -> push + in_app
 *   session.started    -> push + in_app (charging_update realtime)
 *   session.completed  -> push + email (charging_update realtime)
 *   queue.updated      -> in_app (queue_update realtime)
 */

// BookingNotificationConsumer

@Injectable()
export class BookingNotificationConsumer {
  private readonly logger = new Logger(BookingNotificationConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly engine: DeliveryEngine,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'booking.created',
    queue:        'notification.booking.created',
    queueOptions: buildQueueOpts('dlq.notification.booking.created'),
  })
  async onBookingCreated(payload: BookingCreatedEvent): Promise<void> {
    const eventId = payload.eventId ?? `booking.created:${payload.bookingId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'booking.created', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['booking.created'];
    await this.engine.dispatch({
      userId:    payload.userId,
      type:      'booking.created',
      channels:  ['in_app', 'push'],
      title:     tpl.title(payload),
      body:      tpl.body(payload),
      metadata:  { bookingId: payload.bookingId, startTime: payload.startTime },
    });

    this.logger.log(`booking.created notification: user=${payload.userId} booking=${payload.bookingId}`);
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'booking.confirmed',
    queue:        'notification.booking.completed',
    queueOptions: buildQueueOpts('dlq.notification.booking.completed'),
  })
  async onBookingConfirmed(payload: BookingConfirmedEvent): Promise<void> {
    const eventId = payload.eventId ?? `booking.confirmed:${payload.bookingId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'booking.confirmed', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['booking.confirmed'];
    await this.engine.dispatch({
      userId:    payload.userId,
      type:      'booking.confirmed',
      channels:  ['in_app', 'push'],
      title:     tpl.title(payload),
      body:      tpl.body(payload),
      metadata:  { bookingId: payload.bookingId },
      realtimePayload: {
        bookingUpdate: {
          bookingId: payload.bookingId,
          status:    'confirmed',
          message:   tpl.body(payload),
          metadata:  { stationId: payload.stationId },
        },
      },
    });
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'booking.cancelled',
    queue:        'notification.booking.cancelled',
    queueOptions: buildQueueOpts('dlq.notification.booking.cancelled'),
  })
  async onBookingCancelled(payload: BookingCancelledEvent): Promise<void> {
    const eventId = payload.eventId ?? `booking.cancelled:${payload.bookingId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'booking.cancelled', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['booking.cancelled'];
    await this.engine.dispatch({
      userId:    payload.userId,
      type:      'booking.cancelled',
      channels:  ['in_app', 'push'],
      title:     tpl.title(payload),
      body:      tpl.body(payload),
      metadata:  { bookingId: payload.bookingId, reason: payload.reason },
      realtimePayload: {
        bookingUpdate: {
          bookingId: payload.bookingId,
          status:    'cancelled',
          message:   tpl.body(payload),
        },
      },
    });
  }
}

// PaymentNotificationConsumer

@Injectable()
export class PaymentNotificationConsumer {
  private readonly logger = new Logger(PaymentNotificationConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly engine: DeliveryEngine,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'payment.success',
    queue:        'notification.payment.success',
    queueOptions: buildQueueOpts(),
  })
  async onPaymentCompleted(payload: PaymentCompletedEvent): Promise<void> {
    const eventId = payload.eventId ?? `payment.completed:${payload.transactionId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'payment.completed', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['payment.completed'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'payment.completed',
      channels: ['push', 'in_app'],
      title:    tpl.title(payload),
      body:     tpl.body(payload),
      metadata: { transactionId: payload.transactionId, amount: payload.amount },
    });
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'payment.failed',
    queue:        'notification.payment.failed',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async onPaymentFailed(payload: PaymentFailedEvent): Promise<void> {
    const eventId = payload.eventId ?? `payment.failed:${payload.transactionId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'payment.failed', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['payment.failed'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'payment.failed',
      channels: ['push', 'in_app'],
      title:    tpl.title(payload),
      // Use reason from PaymentFailedEvent (contains information about the amount to deposit)
      body:     payload.reason ?? tpl.body(payload),
      metadata: { transactionId: payload.transactionId, reason: payload.reason },
    });
  }
}

// ChargingNotificationConsumer

@Injectable()
export class ChargingNotificationConsumer {
  private readonly logger = new Logger(ChargingNotificationConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly engine: DeliveryEngine,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'session.started',
    queue:        'notification.charging.started',
    queueOptions: buildQueueOpts(),
  })
  async onSessionStarted(payload: SessionStartedEvent): Promise<void> {
    const eventId = payload.eventId ?? `session.started:${payload.sessionId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'session.started', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['session.started'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'session.started',
      channels: ['push', 'in_app'],
      title:    tpl.title(payload),
      body:     tpl.body(payload),
      metadata: { sessionId: payload.sessionId, chargerId: payload.chargerId },
      realtimePayload: {
        chargingUpdate: {
          sessionId: payload.sessionId,
          eventType: 'session.started',
          message:   tpl.body(payload),
        },
      },
    });

    this.logger.log(`session.started notification: user=${payload.userId} session=${payload.sessionId}`);
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'session.completed',
    queue:        'notification.charging.completed',
    queueOptions: buildQueueOpts(),
  })
  async onSessionCompleted(payload: SessionCompletedEvent): Promise<void> {
    const eventId = payload.eventId ?? `session.completed:${payload.sessionId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'session.completed', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['session.completed'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'session.completed',
      channels: ['push', 'email'],
      title:    tpl.title(payload),
      body:     tpl.body(payload),
      metadata: {
        sessionId:       payload.sessionId,
        kwhConsumed:     payload.kwhConsumed,
        durationMinutes: payload.durationMinutes,
      },
      realtimePayload: {
        chargingUpdate: {
          sessionId:   payload.sessionId,
          eventType:   'session.completed',
          kwhConsumed: payload.kwhConsumed,
          durationMin: payload.durationMinutes,
          message:     tpl.body(payload),
        },
      },
    });
  }
}

// QueueNotificationConsumer

@Injectable()
export class QueueNotificationConsumer {
  private readonly logger = new Logger(QueueNotificationConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly engine: DeliveryEngine,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'queue.*',
    queue:        'notification.queue',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async onQueueUpdated(payload: QueueUpdatedEvent): Promise<void> {
    const eventId = payload.eventId ?? `queue.updated:${payload.queueId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'queue.updated', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['queue.updated'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'queue.updated',
      channels: ['in_app'],
      title:    tpl.title(payload),
      body:     tpl.body(payload),
      metadata: {
        queueId:              payload.queueId,
        position:             payload.position,
        estimatedWaitMinutes: payload.estimatedWaitMinutes,
        status:               payload.status,
      },
      realtimePayload: {
        queueUpdate: {
          queueId:              payload.queueId,
          position:             payload.position,
          estimatedWaitMinutes: payload.estimatedWaitMinutes,
          status:               payload.status,
          chargerId:            payload.chargerId,
        },
      },
    });

    this.logger.log(
      `queue.updated notification: user=${payload.userId} position=${payload.position} status=${payload.status}`,
    );
  }
}

// BookingLifecycleExtendedConsumer
// Handles: booking.expired, booking.no_show

@Injectable()
export class BookingLifecycleExtendedConsumer {
  private readonly logger = new Logger(BookingLifecycleExtendedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly engine: DeliveryEngine,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'booking.expired',
    queue:        'notification.booking.expired',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async onBookingExpired(payload: {
    eventId?: string;
    bookingId: string;
    userId: string;
    chargerId: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `booking.expired:${payload.bookingId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'booking.expired', this.peRepo);

    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'booking.expired',
      channels: ['in_app', 'push'],
      title:    'Booking đã hết hạn ⏰',
      body:     'Booking của bạn đã tự động hủy do không thanh toán tiền cọ trong 5 phút. ' +
                'Vui lòng kiểm tra số dư ví và đặt lại.',
      metadata: { bookingId: payload.bookingId },
    });

    this.logger.log(`booking.expired notification: user=${payload.userId} booking=${payload.bookingId}`);
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'booking.no_show',
    queue:        'notification.booking.no_show',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async onBookingNoShow(payload: {
    eventId?: string;
    bookingId: string;
    userId: string;
    chargerId: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `booking.no_show:${payload.bookingId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'booking.no_show', this.peRepo);

    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'booking.no_show',
      channels: ['in_app', 'push'],
      title:    'Bạn đã không xuất hiện (No-Show)',
      body:     'Booking của bạn đã bị đánh dấu no-show. Slot đã được giải phóng cho người khác.',
      metadata: { bookingId: payload.bookingId },
    });

    this.logger.log(`booking.no_show notification: user=${payload.userId} booking=${payload.bookingId}`);
  }
}

// FaultNotificationConsumer

@Injectable()
export class FaultNotificationConsumer {
  private readonly logger = new Logger(FaultNotificationConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly engine: DeliveryEngine,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'charger.fault.detected',
    queue:        'notification.charger.fault',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async onChargerFault(payload: {
    eventId?: string;
    chargerId: string;
    sessionId?: string;
    errorCode: string;
    detectedAt: string;
    affectedUserId?: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `charger.fault:${payload.chargerId}:${payload.detectedAt}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'charger.fault.detected', this.peRepo);

    // Notify affected user (if session active)
    if (payload.affectedUserId) {
      await this.engine.dispatch({
        userId:   payload.affectedUserId,
        type:     'charger.fault',
        channels: ['push', 'in_app'],
        title:    'Sá»± cá»‘ tráº¡m sáº¡c',
        body:     `Tráº¡m sáº¡c Ä‘ang gáº·p sá»± cá»‘ (mÃ£: ${payload.errorCode}). NhÃ¢n viÃªn Ä‘ang xá»­ lÃ½.`,
        metadata: { chargerId: payload.chargerId, errorCode: payload.errorCode },
        realtimePayload: {
          chargingUpdate: {
            sessionId: payload.sessionId,
            eventType: 'charger.fault',
            message:   `Charger fault: ${payload.errorCode}`,
          },
        },
      });
    }

    this.logger.warn(
      `charger.fault notification: charger=${payload.chargerId} code=${payload.errorCode}`,
    );
  }
}

// BillingNotificationConsumer
// billing.idle_fee_charged_v1 | billing.extra_charge_v1 | billing.refund_issued_v1

@Injectable()
export class BillingNotificationConsumer {
  private readonly logger = new Logger(BillingNotificationConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly engine: DeliveryEngine,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'billing.idle_fee_charged_v1',
    queue:        'notification.billing.idle_fee',
    queueOptions: buildQueueOpts('dlq.notification.billing.idle_fee'),
  })
  async onIdleFeeCharged(payload: BillingIdleFeeChargedEvent): Promise<void> {
    const eventId = payload.eventId ?? `billing.idle_fee:${payload.sessionId}:${payload.transactionId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'billing.idle_fee_charged_v1', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['billing.idle_fee_charged_v1'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'billing.idle_fee_charged_v1',
      channels: ['push', 'in_app'],
      title:    tpl.title(payload),
      body:     tpl.body(payload),
      metadata: {
        sessionId:             payload.sessionId,
        idleFeeVnd:            payload.idleFeeVnd,
        chargeableIdleMinutes: payload.chargeableIdleMinutes,
        idleFeePerMinuteVnd:   payload.idleFeePerMinuteVnd,
        idleGraceMinutes:      payload.idleGraceMinutes,
        transactionId:         payload.transactionId,
      },
    });

    this.logger.warn(
      `billing.idle_fee: user=${payload.userId} fee=${payload.idleFeeVnd}VND idleMin=${payload.chargeableIdleMinutes}`,
    );
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'billing.extra_charge_v1',
    queue:        'notification.billing.extra_charge',
    queueOptions: buildQueueOpts('dlq.notification.billing.extra_charge'),
  })
  async onExtraCharge(payload: BillingExtraChargeEvent): Promise<void> {
    const eventId = payload.eventId ?? `billing.extra_charge:${payload.sessionId}:${payload.transactionId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'billing.extra_charge_v1', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['billing.extra_charge_v1'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'billing.extra_charge_v1',
      channels: ['push', 'in_app'],
      title:    tpl.title(payload),
      body:     tpl.body(payload),
      metadata: {
        sessionId:      payload.sessionId,
        extraAmountVnd: payload.extraAmountVnd,
        depositAmount:  payload.depositAmount,
        totalFeeVnd:    payload.totalFeeVnd,
        transactionId:  payload.transactionId,
      },
    });

    this.logger.log(
      `billing.extra_charge: user=${payload.userId} extra=${payload.extraAmountVnd}VND`,
    );
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'billing.refund_issued_v1',
    queue:        'notification.billing.refund',
    queueOptions: buildQueueOpts('dlq.notification.billing.refund'),
  })
  async onRefundIssued(payload: BillingRefundIssuedEvent): Promise<void> {
    const eventId = payload.eventId ?? `billing.refund:${payload.sessionId}:${payload.transactionId}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'billing.refund_issued_v1', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['billing.refund_issued_v1'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'billing.refund_issued_v1',
      channels: ['push', 'in_app'],
      title:    tpl.title(payload),
      body:     tpl.body(payload),
      metadata: {
        sessionId:       payload.sessionId,
        refundAmountVnd: payload.refundAmountVnd,
        depositAmount:   payload.depositAmount,
        totalFeeVnd:     payload.totalFeeVnd,
        transactionId:   payload.transactionId,
      },
    });

    this.logger.log(
      `billing.refund_issued: user=${payload.userId} refund=${payload.refundAmountVnd}VND`,
    );
  }
}

// AuthNotificationConsumer

@Injectable()
export class AuthNotificationConsumer {
  private readonly logger = new Logger(AuthNotificationConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly engine: DeliveryEngine,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging', // IAM service publishes to ev.charging
    routingKey:   'user.email_verification_requested',
    queue:        'notification.user.email_verification',
    queueOptions: buildQueueOpts('dlq.notification.user.email_verification'),
  })
  async onEmailVerificationRequested(payload: EmailVerificationRequestedEvent): Promise<void> {
    const eventId = payload.eventId ?? `user.email_verification:${payload.userId}:${Date.now()}`;
    if (await this.engine.isProcessed(eventId, this.peRepo)) return;
    await this.engine.markProcessed(eventId, 'user.email_verification_requested', this.peRepo);

    const tpl = NOTIFICATION_TEMPLATES['user.email_verification_requested'];
    await this.engine.dispatch({
      userId:   payload.userId,
      type:     'user.email_verification_requested' as any, // Not yet in NotificationType enum, using as any for now or need to add it
      channels: ['email'],
      title:    tpl.title(payload),
      body:     tpl.body(payload),
      metadata: {
        targetEmail: payload.email,
        rawToken:    payload.rawToken,
        shortCode:   payload.shortCode,
      },
    });

    this.logger.log(`user.email_verification_requested notification: email=${payload.email}`);
  }
}
