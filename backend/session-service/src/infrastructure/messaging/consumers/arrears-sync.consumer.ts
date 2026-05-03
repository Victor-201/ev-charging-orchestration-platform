import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  ProcessedEventOrmEntity,
  UserDebtReadModelOrmEntity,
} from '../../persistence/typeorm/entities/booking.orm-entities';

// ─── WalletArrearsCreatedConsumer ─────────────────────────────────────────────

/**
 * Lắng nghe wallet.arrears.created từ Payment Service.
 * Cập nhật local read-model user_debt_read_models trong booking-service DB.
 * Cho phép ArrearsGuard check local mà không cần gọi remote service.
 */
@Injectable()
export class BookingArrearsCreatedConsumer {
  private readonly logger = new Logger(BookingArrearsCreatedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(UserDebtReadModelOrmEntity)
    private readonly debtRepo: Repository<UserDebtReadModelOrmEntity>,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'wallet.arrears.created',
    queue:        'booking-svc.wallet.arrears.created',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    userId: string;
    walletId: string;
    arrearsAmount: number;
    sessionId: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `booking.arrears.created:${payload.sessionId}`;
    if (await this.peRepo.existsBy({ eventId })) return;
    await this.peRepo.save({ eventId, eventType: 'wallet.arrears.created' });

    // Upsert read-model
    const existing = await this.debtRepo.findOneBy({ userId: payload.userId });
    if (existing) {
      await this.debtRepo.update(payload.userId, {
        hasOutstandingDebt: true,
        arrearsAmount:      Number(existing.arrearsAmount) + payload.arrearsAmount,
        syncedAt:           new Date(),
      } as any);
    } else {
      await this.debtRepo.save(this.debtRepo.create({
        userId:             payload.userId,
        hasOutstandingDebt: true,
        arrearsAmount:      payload.arrearsAmount,
        syncedAt:           new Date(),
      }));
    }

    this.logger.warn(
      `[ARREARS LOCK] Booking-service ghi nhận nợ user=${payload.userId} ` +
      `amount=${payload.arrearsAmount}VND — booking bị chặn`,
    );
  }
}

// ─── WalletArrearsClearedConsumer ─────────────────────────────────────────────

/**
 * Lắng nghe wallet.arrears.cleared từ Payment Service.
 * Reset cờ nợ → user được phép đặt booking trở lại.
 */
@Injectable()
export class BookingArrearsClearedConsumer {
  private readonly logger = new Logger(BookingArrearsClearedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(UserDebtReadModelOrmEntity)
    private readonly debtRepo: Repository<UserDebtReadModelOrmEntity>,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'wallet.arrears.cleared',
    queue:        'booking-svc.wallet.arrears.cleared',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    userId: string;
    walletId: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `booking.arrears.cleared:${payload.userId}:${Date.now()}`;
    if (await this.peRepo.existsBy({ eventId })) return;
    await this.peRepo.save({ eventId, eventType: 'wallet.arrears.cleared' });

    await this.debtRepo.update(
      { userId: payload.userId },
      { hasOutstandingDebt: false, arrearsAmount: 0, syncedAt: new Date() } as any,
    );

    this.logger.log(
      `[ARREARS CLEARED] Booking-service mở khóa user=${payload.userId} — booking được phép đặt lại`,
    );
  }
}
