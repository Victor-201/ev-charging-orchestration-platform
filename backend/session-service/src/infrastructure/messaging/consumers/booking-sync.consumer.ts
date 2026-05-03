import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  BookingReadModelOrmEntity,
} from '../../persistence/typeorm/entities/session.orm-entities';

/**
 * BookingConfirmedSyncConsumer
 *
 * Lắng nghe booking.confirmed từ Booking Service.
 * Sync vào booking_read_models trong charging DB để:
 *   1. Validate QR time window (startTime ± 15 phút)
 *   2. Lấy depositAmount + depositTransactionId cho billing reconciliation
 *   3. Validate connector type match
 *
 * Event payload (từ BookingConfirmedEvent):
 *   bookingId, userId, chargerId, qrToken,
 *   depositAmount, startTime, endTime
 */
@Injectable()
export class BookingConfirmedSyncConsumer {
  private readonly logger = new Logger(BookingConfirmedSyncConsumer.name);

  constructor(
    @InjectRepository(BookingReadModelOrmEntity)
    private readonly repo: Repository<BookingReadModelOrmEntity>,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'booking.confirmed',
    queue:        'charging-svc.booking.confirmed.sync',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    bookingId:          string;
    userId:             string;
    chargerId:          string;
    qrToken:            string;
    depositAmount:      number;
    depositTransactionId?: string;
    startTime:          string;
    endTime:            string;
    connectorType?:     string;
  }): Promise<void> {
    await this.repo.upsert(
      {
        bookingId:           payload.bookingId,
        userId:              payload.userId,
        chargerId:           payload.chargerId,
        qrToken:             payload.qrToken,
        depositAmount:       payload.depositAmount,
        depositTransactionId: payload.depositTransactionId ?? null,
        startTime:           new Date(payload.startTime),
        endTime:             new Date(payload.endTime),
        connectorType:       payload.connectorType ?? null,
        syncedAt:            new Date(),
      },
      ['bookingId'],
    );

    this.logger.log(
      `BookingReadModel synced: booking=${payload.bookingId} ` +
      `charger=${payload.chargerId} window=${payload.startTime}~${payload.endTime}`,
    );
  }
}

/**
 * BookingCancelledSyncConsumer
 *
 * Xóa booking_read_model khi booking bị hủy/hết hạn.
 * Đảm bảo QR bị vô hiệu ngay lập tức.
 */
@Injectable()
export class BookingCancelledSyncConsumer {
  private readonly logger = new Logger(BookingCancelledSyncConsumer.name);

  constructor(
    @InjectRepository(BookingReadModelOrmEntity)
    private readonly repo: Repository<BookingReadModelOrmEntity>,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'booking.cancelled',
    queue:        'charging-svc.booking.cancelled.sync',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handleCancelled(payload: { bookingId: string }): Promise<void> {
    await this.repo.delete({ bookingId: payload.bookingId });
    this.logger.log(`BookingReadModel removed (cancelled): ${payload.bookingId}`);
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'booking.expired',
    queue:        'charging-svc.booking.expired.sync',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handleExpired(payload: { bookingId: string }): Promise<void> {
    await this.repo.delete({ bookingId: payload.bookingId });
    this.logger.log(`BookingReadModel removed (expired): ${payload.bookingId}`);
  }
}
