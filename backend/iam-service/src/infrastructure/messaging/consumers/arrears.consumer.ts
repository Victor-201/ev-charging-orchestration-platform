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

// WalletArrearsCreatedConsumer

/**
 * Listens for wallet.arrears.created from Payment Service.
 *
 * When a user has insufficient funds for payment exceeding the deposit:
 * 1. Record debt in user_arrears.
 * 2. Set hasOutstandingDebt = true and arrearsAmount in users_cache.
 * 3. The user will be blocked from creating new bookings until the debt is cleared.
 *
 * API Gateway middleware checks hasOutstandingDebt before allowing POST /bookings.
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

    // Record debt
    await this.arrearsRepo.save(this.arrearsRepo.create({
      id:            uuidv4(),
      userId:        payload.userId,
      walletId:      payload.walletId,
      sessionId:     payload.sessionId,
      arrearsAmount: payload.arrearsAmount,
      status:        'outstanding',
      clearedAt:     null,
    }));

    // Update flag on users_cache
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

// WalletArrearsClearedConsumer

/**
 * Listens for wallet.arrears.cleared from Payment Service.
 *
 * When a user tops up enough to clear the debt:
 * 1. Mark all arrears as cleared.
 * 2. Reset hasOutstandingDebt = false.
 * 3. The user can book again.
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

    // Clear all outstanding arrears
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
