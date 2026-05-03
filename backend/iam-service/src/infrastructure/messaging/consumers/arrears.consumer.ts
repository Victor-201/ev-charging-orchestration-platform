import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuidv4 } from 'uuid';
import {
  ProcessedEventOrmEntity,
  UsersCacheOrmEntity,
  UserArrearsOrmEntity,
} from '../../persistence/typeorm/entities/user.orm-entities';

// ─── WalletArrearsCreatedConsumer ─────────────────────────────────────────────

/**
 * Lắng nghe wallet.arrears.created từ Payment Service.
 *
 * Khi user không đủ tiền thanh toán phần vượt deposit:
 * 1. Ghi nợ vào user_arrears
 * 2. Set flag hasOutstandingDebt = true + arrearsAmount trên users_cache
 * 3. User sẽ bị chặn tạo booking mới cho đến khi thanh toán hết nợ
 *
 * Middleware tại API Gateway check hasOutstandingDebt trước khi cho vào POST /bookings.
 */
@Injectable()
export class WalletArrearsCreatedConsumer {
  private readonly logger = new Logger(WalletArrearsCreatedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(UsersCacheOrmEntity)
    private readonly usersCacheRepo: Repository<UsersCacheOrmEntity>,
    @InjectRepository(UserArrearsOrmEntity)
    private readonly arrearsRepo: Repository<UserArrearsOrmEntity>,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'wallet.arrears.created',
    queue:        'user-svc.wallet.arrears.created',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    userId: string;
    walletId: string;
    arrearsAmount: number;
    sessionId: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `wallet.arrears.created:${payload.sessionId}`;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) return;
    await this.peRepo.save({ eventId, eventType: 'wallet.arrears.created' });

    // Ghi record nợ
    await this.arrearsRepo.save(this.arrearsRepo.create({
      id:            uuidv4(),
      userId:        payload.userId,
      walletId:      payload.walletId,
      sessionId:     payload.sessionId,
      arrearsAmount: payload.arrearsAmount,
      status:        'outstanding',
      clearedAt:     null,
    }));

    // Cập nhật flag trên users_cache
    const user = await this.usersCacheRepo.findOneBy({ userId: payload.userId });
    if (user) {
      await this.usersCacheRepo.update(payload.userId, {
        hasOutstandingDebt: true,
        arrearsAmount:      (user.arrearsAmount ?? 0) + payload.arrearsAmount,
        syncedAt:           new Date(),
      } as any);
    }

    this.logger.error(
      `ARREARS LOCK: user=${payload.userId} arrears=${payload.arrearsAmount}VND ` +
      `session=${payload.sessionId} — account locked until debt cleared`,
    );
  }
}

// ─── WalletArrearsClearedConsumer ─────────────────────────────────────────────

/**
 * Lắng nghe wallet.arrears.cleared từ Payment Service.
 *
 * Khi user nạp tiền đủ để trả nợ:
 * 1. Mark tất cả arrears = cleared
 * 2. Reset hasOutstandingDebt = false
 * 3. User có thể đặt booking lại
 */
@Injectable()
export class WalletArrearsClearedConsumer {
  private readonly logger = new Logger(WalletArrearsClearedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(UsersCacheOrmEntity)
    private readonly usersCacheRepo: Repository<UsersCacheOrmEntity>,
    @InjectRepository(UserArrearsOrmEntity)
    private readonly arrearsRepo: Repository<UserArrearsOrmEntity>,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'wallet.arrears.cleared',
    queue:        'user-svc.wallet.arrears.cleared',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    userId: string;
    walletId: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `wallet.arrears.cleared:${payload.userId}:${Date.now()}`;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) return;
    await this.peRepo.save({ eventId, eventType: 'wallet.arrears.cleared' });

    // Clear tất cả outstanding arrears
    await this.arrearsRepo.update(
      { userId: payload.userId, status: 'outstanding' },
      { status: 'cleared', clearedAt: new Date(), updatedAt: new Date() } as any,
    );

    // Reset flag
    await this.usersCacheRepo.update(payload.userId, {
      hasOutstandingDebt: false,
      arrearsAmount:      0,
      syncedAt:           new Date(),
    } as any);

    this.logger.log(`ARREARS CLEARED: user=${payload.userId} — account unlocked`);
  }
}
