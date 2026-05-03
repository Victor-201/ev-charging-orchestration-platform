import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuidv4 } from 'uuid';

import {
  IWalletRepository, WALLET_REPOSITORY,
} from '../../../domain/repositories/wallet.repository.interface';
import {
  ITransactionRepository, TRANSACTION_REPOSITORY,
} from '../../../domain/repositories/transaction.repository.interface';
import { Transaction } from '../../../domain/entities/transaction.aggregate';
import {
  RefundCompletedEvent,
  WalletArrearsCreatedEvent,
  WalletArrearsClearedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  BillingDeductedEvent,
  BillingDeductionFailedEvent,
  IdleFeeChargedEvent,
  ExtraChargeDebitedEvent,
  RefundIssuedEvent,
} from '../../../domain/events/payment.events';
import {
  EVENT_BUS, IPaymentEventBus,
} from '../outbox-event-bus';
import {
  ProcessedEventOrmEntity,
  InvoiceOrmEntity,
  WalletOrmEntity,
} from '../../persistence/typeorm/entities/payment.orm-entities';
import { Inject } from '@nestjs/common';

// ─── SessionReservedConsumer ──────────────────────────────────────────

/**
 * Lắng nghe booking.deposit_requested từ Booking Service.
 *
 * Tự động trừ tiền cọc từ Ví của user:
 * 1. Kiểm tra số dư ví ≥ depositAmount
 * 2. Nếu đủ → trừ ví, tạo Transaction completed → emit PaymentCompletedEvent
 * 3. Nếu không đủ → emit PaymentFailedEvent → Booking Service sẽ expire booking
 *
 * PaymentCompletedEvent có relatedType='booking' → Booking Service lắng nghe
 * → tự động confirmWithPayment() → sinh QR Token.
 */
@Injectable()
export class SessionReservedConsumer {
  private readonly logger = new Logger(SessionReservedConsumer.name);

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey: 'session.reserved_v1',
    queue: 'billing-svc.session.reserved_v1',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?:      string;
    bookingId:     string;
    userId:        string;
    chargerId:     string;
    depositAmount: number;
    correlationId?: string;
  }): Promise<void> {
    const correlationId = payload.correlationId ?? uuidv4();
    const eventId = payload.eventId ?? `session.reserved:${payload.bookingId}`;

    const exists = await this.peRepo.existsBy({ eventId });
    if (exists) {
      this.logger.debug(`[SAGA] Duplicate event ${eventId}, skipping`);
      return;
    }
    await this.peRepo.save({ eventId, eventType: 'session.reserved_v1' });

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const wallet = await this.walletRepo.findByUserId(payload.userId);
      if (!wallet) {
        this.logger.error(`[SAGA] Wallet not found for user ${payload.userId} (bookingId=${payload.bookingId})`);
        await this.eventBus.publishAll(
          [new BillingDeductionFailedEvent(payload.bookingId, payload.userId, 'WALLET_NOT_FOUND', correlationId)],
          manager,
        );
        return;
      }

      const balance = await this.walletRepo.getBalance(wallet.id, manager);

      if (balance < payload.depositAmount) {
        this.logger.warn(`[SAGA] Insufficient funds for user ${payload.userId}: balance=${balance} required=${payload.depositAmount}`);
        await this.eventBus.publishAll(
          [new BillingDeductionFailedEvent(payload.bookingId, payload.userId, 'INSUFFICIENT_FUNDS', correlationId)],
          manager,
        );
        return;
      }

      const tx = Transaction.create({
        userId:      wallet.id,
        amount:      payload.depositAmount,
        type:        'payment',
        method:      'wallet',
        relatedId:   payload.bookingId,
        relatedType: 'booking',
      });
      tx.complete();
      await this.txRepo.save(tx, manager);

      await this.walletRepo.debit(wallet.id, tx.id, payload.depositAmount, manager);

      this.logger.log(`[SAGA] Deducted ${payload.depositAmount} from user ${payload.userId} for booking ${payload.bookingId} (correlationId=${correlationId})`);

      await this.eventBus.publishAll(
        [new BillingDeductedEvent(payload.bookingId, payload.userId, payload.depositAmount, tx.id, correlationId)],
        manager,
      );
    });
  }
}

// ─── BookingCancelledConsumer ─────────────────────────────────────────────────

/**
 * Lắng nghe booking.cancelled từ Booking Service.
 *
 * Hoàn trả 100% tiền cọc trực tiếp vào ví (không phải về VNPay):
 * - Dù user ban đầu thanh toán qua VNPay hay ví → luôn hoàn về ví
 * - Giữ tiền trong hệ sinh thái app
 */
@Injectable()
export class BookingCancelledConsumer {
  private readonly logger = new Logger(BookingCancelledConsumer.name);

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey: 'session.cancelled_v1',
    queue: 'billing-svc.session.cancelled_v1',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    bookingId: string;
    userId: string;
    chargerId: string;
    reason: string;
    depositTransactionId?: string;
    refundAmount: number;
  }): Promise<void> {
    if (!payload.depositTransactionId || payload.refundAmount <= 0) return;

    const eventId = payload.eventId ?? `booking.cancelled:${payload.bookingId}`;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) return;
    await this.peRepo.save({ eventId, eventType: 'booking.cancelled' });

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const wallet = await this.walletRepo.findByUserId(payload.userId);
      if (!wallet) {
        this.logger.error(`Wallet not found for user ${payload.userId} — cannot refund`);
        return;
      }

      // Tạo Transaction refund
      const refundTxn = Transaction.create({
        userId:      payload.userId,
        type:        'refund',
        amount:      payload.refundAmount,
        method:      'wallet',
        relatedId:   payload.bookingId,
        relatedType: 'booking',
        meta:        { reason: 'booking_cancelled', originalTxId: payload.depositTransactionId },
      });
      await this.txRepo.save(refundTxn, manager);

      // Hoàn tiền vào ví
      await this.walletRepo.credit(wallet.id, refundTxn.id, payload.refundAmount, manager);
      refundTxn.complete();
      await this.txRepo.save(refundTxn, manager);

      const event = new RefundCompletedEvent(
        refundTxn.id,
        payload.userId,
        payload.refundAmount,
        payload.bookingId,
        'booking_cancelled',
      );
      await this.eventBus.publishAll([event], manager);

      this.logger.log(
        `Refund OK: booking=${payload.bookingId} amount=${payload.refundAmount}VND → wallet user=${payload.userId}`,
      );
    });
  }
}

// ─── BookingNoShowConsumer ────────────────────────────────────────────────────

/**
 * Lắng nghe booking.no_show từ Booking Service.
 *
 * Xử lý phạt No-Show:
 * 1. Trừ phí phạt (đã được tính trong aggregate = 20% deposit)
 * 2. Hoàn phần còn lại (80%) vào ví
 */
@Injectable()
export class BookingNoShowConsumer {
  private readonly logger = new Logger(BookingNoShowConsumer.name);

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey: 'session.no_show_v1',
    queue: 'billing-svc.session.no_show_v1',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    bookingId: string;
    userId: string;
    chargerId: string;
    penaltyAmount: number;
    refundAmount: number;
    depositTransactionId?: string;
  }): Promise<void> {
    if (!payload.depositTransactionId) return;

    const eventId = payload.eventId ?? `booking.no_show:${payload.bookingId}`;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) return;
    await this.peRepo.save({ eventId, eventType: 'booking.no_show' });

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const wallet = await this.walletRepo.findByUserId(payload.userId);
      if (!wallet) return;

      // Hoàn phần refund vào ví (penalty đã bị trừ trong deposit)
      if (payload.refundAmount > 0) {
        const refundTxn = Transaction.create({
          userId:      payload.userId,
          type:        'refund',
          amount:      payload.refundAmount,
          method:      'wallet',
          relatedId:   payload.bookingId,
          relatedType: 'booking',
          meta:        {
            reason: 'no_show_partial_refund',
            penaltyAmount: payload.penaltyAmount,
            originalTxId:  payload.depositTransactionId,
          },
        });
        await this.txRepo.save(refundTxn, manager);
        await this.walletRepo.credit(wallet.id, refundTxn.id, payload.refundAmount, manager);
        refundTxn.complete();
        await this.txRepo.save(refundTxn, manager);

        const event = new RefundCompletedEvent(
          refundTxn.id,
          payload.userId,
          payload.refundAmount,
          payload.bookingId,
          'no_show_partial_refund',
        );
        await this.eventBus.publishAll([event], manager);
      }

      this.logger.warn(
        `No-Show penalty: booking=${payload.bookingId} user=${payload.userId} ` +
        `penalty=${payload.penaltyAmount}VND refund=${payload.refundAmount}VND`,
      );
    });
  }
}

// ─── SessionCompletedBillingConsumer (Billing Reconciliation) ───────────────────────

/**
 * Lắng nghe session.completed từ session-service (sau khi OCPP gửi StopTransaction).
 *
 * Flow:
 *   1. Gọi ev-infrastructure-service để tính phí chính xác (TOU + Idle Fee)
 *   2. So sánh với tiền cọc đã giữ
 *   3. Case 1: totalFee < deposit → Hoàn phần dư vào ví + emit RefundIssuedEvent
 *   4. Case 2: totalFee > deposit → Trừ thêm từ ví + emit ExtraChargeDebitedEvent
 *      Nếu ví không đủ → ghi nợ (arrears) + khóa tài khoản
 *   5. Nếu idleFeeVnd > 0 → emit IdleFeeChargedEvent (notification riêng)
 *   6. Tạo Invoice tổng hóa đơn
 *
 * Pricing self-computed tại billing-service (không tin upstream):
 *   - Gọi POST /api/v1/stations/:stationId/chargers/:chargerId/pricing/calculate-session-fee
 *   - Nhận: { energyFeeVnd, idleFeeVnd, totalFeeVnd, ... }
 */
@Injectable()
export class SessionCompletedBillingConsumer {
  private readonly logger = new Logger(SessionCompletedBillingConsumer.name);

  /** URL nội bộ đến ev-infrastructure-service */
  private readonly infraBaseUrl: string;

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(InvoiceOrmEntity)
    private readonly invoiceRepo: Repository<InvoiceOrmEntity>,
    @InjectRepository(WalletOrmEntity)
    private readonly walletOrmRepo: Repository<WalletOrmEntity>,
    private readonly dataSource: DataSource,
  ) {
    // Mặc định container network alias; ghi đè bằng EV_INFRA_BASE_URL
    this.infraBaseUrl = process.env['EV_INFRA_BASE_URL'] ?? 'http://ev-infrastructure:3003';
  }

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'session.completed_v1',
    queue:        'billing-svc.session.completed_v1',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?:     string;
    sessionId:    string;
    userId:       string;
    chargerId:    string;
    stationId:    string;
    connectorType: string;
    bookingId?:   string;
    kwhConsumed:  number;
    idleMinutes:  number;    // phút chiếm dụng sau khi sạc đầy (từ OCPP telemetry)
    startTime:    string;    // ISO — dùng để lookup TOU pricing rule
    depositAmount?: number;
    depositTransactionId?: string;
    durationMinutes: number;
  }): Promise<void> {
    const eventId = payload.eventId ?? `session.completed:${payload.sessionId}`;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) return;
    await this.peRepo.save({ eventId, eventType: 'session.completed' });

    // ── STEP 1: Tính phí thực tế từ pricing service ──────────────────────────
    let energyFeeVnd = 0;
    let idleFeeVnd   = 0;
    let totalFeeVnd  = 0;
    let ruleId: string | null = null;
    let chargeableIdleMinutes = 0;
    let idleFeePerMinuteVnd   = 1_000;
    let idleGraceMinutes      = 20;

    try {
      const feeBreakdown = await this.fetchSessionFee(payload);
      energyFeeVnd          = feeBreakdown.energyFeeVnd;
      idleFeeVnd            = feeBreakdown.idleFeeVnd;
      totalFeeVnd           = feeBreakdown.totalFeeVnd;
      ruleId                = feeBreakdown.ruleId;
      chargeableIdleMinutes = feeBreakdown.chargeableIdleMinutes;
      idleFeePerMinuteVnd   = feeBreakdown.idleFeePerMinuteVnd;
      idleGraceMinutes      = feeBreakdown.idleGraceMinutes;

      this.logger.log(
        `Pricing OK session=${payload.sessionId}: ` +
        `energy=${energyFeeVnd} idle=${idleFeeVnd} total=${totalFeeVnd} rule=${ruleId}`,
      );
    } catch (err) {
      // Fallback: dùng giá trị upstream nếu pricing service không phản hồi
      this.logger.error(`Pricing API failed — using upstream values: ${err}`);
      energyFeeVnd = Math.ceil((payload.kwhConsumed ?? 0) * 3_500); // fallback 3.500 VND/kWh
      idleFeeVnd   = Math.ceil(Math.max(0, (payload.idleMinutes ?? 0) - 20) * 1_000);
      totalFeeVnd  = energyFeeVnd + idleFeeVnd;
      chargeableIdleMinutes = Math.max(0, (payload.idleMinutes ?? 0) - 20);
    }

    const depositAmt = payload.depositAmount ?? 0;
    const diff       = totalFeeVnd - depositAmt; // + = cần thu thêm, - = hoàn trả

    this.logger.log(
      `Reconcile session=${payload.sessionId} totalFee=${totalFeeVnd} deposit=${depositAmt} diff=${diff}`,
    );

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const wallet = await this.walletRepo.findByUserId(payload.userId);
      if (!wallet) {
        this.logger.error(`No wallet for user ${payload.userId} — session ${payload.sessionId}`);
        return;
      }

      const eventsToEmit: any[] = [];

      // ── Xử lý idle fee notification (luôn emit nếu có idle) ──────────────
      if (idleFeeVnd > 0) {
        // Tạo transaction riêng cho idle fee (để hóa đơn rõ ràng)
        const idleTxn = Transaction.create({
          userId:      payload.userId,
          type:        'payment',
          amount:      idleFeeVnd,
          method:      'wallet',
          relatedId:   payload.sessionId,
          relatedType: 'charging_session',
          meta: {
            reason: 'idle_fee',
            chargeableIdleMinutes,
            idleFeePerMinuteVnd,
            idleGraceMinutes,
          },
        });
        await this.txRepo.save(idleTxn, manager);
        idleTxn.complete();
        await this.txRepo.save(idleTxn, manager);

        eventsToEmit.push(new IdleFeeChargedEvent(
          payload.sessionId, payload.userId,
          idleFeeVnd, chargeableIdleMinutes,
          idleFeePerMinuteVnd, idleGraceMinutes,
          idleTxn.id,
        ));
      }

      // ── Đối soát tiền cọc vs tổng phí ────────────────────────────────────
      if (diff < -1) {
        // Hoàn phần dư thừa vào ví
        const refundAmt = Math.abs(diff);
        const refundTxn = Transaction.create({
          userId:      payload.userId,
          type:        'refund',
          amount:      refundAmt,
          method:      'wallet',
          relatedId:   payload.sessionId,
          relatedType: 'charging_session',
          meta: { reason: 'deposit_overpaid', depositAmount: depositAmt, totalFeeVnd },
        });
        await this.txRepo.save(refundTxn, manager);
        await this.walletRepo.credit(wallet.id, refundTxn.id, refundAmt, manager);
        refundTxn.complete();
        await this.txRepo.save(refundTxn, manager);

        eventsToEmit.push(new RefundIssuedEvent(
          payload.sessionId, payload.userId,
          refundAmt, depositAmt, totalFeeVnd, refundTxn.id,
        ));

        this.logger.log(`Hoàn dư: ${refundAmt}VND → ví user=${payload.userId}`);

      } else if (diff > 1) {
        // Thu thêm phần thiếu từ ví
        const balance = await this.walletRepo.getBalance(wallet.id, manager);

        if (balance >= diff) {
          await this.walletRepo.lockForUpdate(wallet.id, manager);
          const chargeTxn = Transaction.create({
            userId:      payload.userId,
            type:        'payment',
            amount:      diff,
            method:      'wallet',
            relatedId:   payload.sessionId,
            relatedType: 'charging_session',
            meta: { reason: 'deposit_underpaid', depositAmount: depositAmt, totalFeeVnd },
          });
          await this.txRepo.save(chargeTxn, manager);
          await this.walletRepo.debit(wallet.id, chargeTxn.id, diff, manager);
          chargeTxn.complete();
          await this.txRepo.save(chargeTxn, manager);

          eventsToEmit.push(new ExtraChargeDebitedEvent(
            payload.sessionId, payload.userId,
            diff, depositAmt, totalFeeVnd, chargeTxn.id,
          ));

          this.logger.log(`Thu thêm: ${diff}VND từ ví user=${payload.userId}`);
        } else {
          // Ví không đủ → ghi nợ, khóa tài khoản
          const arrearsAmount = diff - balance;
          this.logger.error(
            `Ví không đủ: user=${payload.userId} thiếu=${diff}VND có=${balance}VND — ghi nợ ${arrearsAmount}VND`,
          );

          if (balance > 1) {
            const partialTxn = Transaction.create({
              userId:      payload.userId,
              type:        'payment',
              amount:      balance,
              method:      'wallet',
              relatedId:   payload.sessionId,
              relatedType: 'charging_session',
              meta: { reason: 'partial_payment', arrearsAmount, totalFeeVnd },
            });
            await this.txRepo.save(partialTxn, manager);
            await this.walletRepo.debit(wallet.id, partialTxn.id, balance, manager);
            partialTxn.complete();
            await this.txRepo.save(partialTxn, manager);
          }

          eventsToEmit.push(new WalletArrearsCreatedEvent(
            payload.userId, wallet.id, arrearsAmount, payload.sessionId,
          ));

          // Notify user về nợ
          eventsToEmit.push(new ExtraChargeDebitedEvent(
            payload.sessionId, payload.userId,
            diff, depositAmt, totalFeeVnd, 'arrears',
          ));
        }
      }
      // Tạo Invoice tổng hóa đơn (nếu chưa có)
      try {
        const invoice2 = manager.create(InvoiceOrmEntity, {
          id:            uuidv4(),
          transactionId: payload.depositTransactionId ?? uuidv4(),
          userId:        payload.userId,
          totalAmount:   totalFeeVnd,
          dueDate:       null as any,
          status:        'paid',
        });
        await manager.save(invoice2);
      } catch {
        // unique constraint nếu đã tồn tại — bỏ qua
      }

      // ── Publish tất cả events ─────────────────────────────────────────────
      if (eventsToEmit.length > 0) {
        await this.eventBus.publishAll(eventsToEmit, manager);
      }
    });
  }

  /**
   * Gọi ev-infrastructure-service để tính phí thực tế.
   * Sử dụng native fetch (Node 18+) — không cần thêm dependency.
   */
  private async fetchSessionFee(payload: {
    chargerId: string;
    stationId: string;
    connectorType: string;
    startTime: string;
    kwhConsumed: number;
    idleMinutes: number;
  }): Promise<{
    energyFeeVnd: number;
    idleFeeVnd: number;
    totalFeeVnd: number;
    ruleId: string | null;
    chargeableIdleMinutes: number;
    idleFeePerMinuteVnd: number;
    idleGraceMinutes: number;
  }> {
    const url = `${this.infraBaseUrl}/api/v1/stations/${payload.stationId}/chargers/${payload.chargerId}/pricing/calculate-session-fee`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectorType: payload.connectorType,
        startTime:     payload.startTime,
        kwhConsumed:   payload.kwhConsumed,
        idleMinutes:   payload.idleMinutes,
      }),
      signal: AbortSignal.timeout(5_000), // 5s timeout
    });

    if (!response.ok) {
      throw new Error(`Pricing API HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json() as any;
  }
}

// ─── WalletTopupConsumer (tự động cấn trừ nợ) ────────────────────────────────

/**
 * Khi user nạp tiền thành công:
 * 1. Nếu user đang có nợ → tự động cấn trừ
 * 2. Nếu nợ = 0 → mở khóa tài khoản (emit WalletArrearsClearedEvent)
 */
@Injectable()
export class WalletTopupArrearsClearConsumer {
  private readonly logger = new Logger(WalletTopupArrearsClearConsumer.name);

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'wallet.topup.completed',
    queue:        'payment-svc.wallet.topup.arrears',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handle(payload: {
    eventId?: string;
    walletId: string;
    userId: string;
    amount: number;
    transactionId: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `wallet.topup.arrears:${payload.transactionId}`;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) return;
    await this.peRepo.save({ eventId, eventType: 'wallet.topup.arrears.check' });

    /**
     * Kiến trúc đúng:
     * - Payment service KHÔNG biết user có nợ hay không (arrears nằm ở user_debt_read_models
     *   của user-service, charging-service, booking-service).
     * - Payment service chỉ biết: topup thành công + balance hiện tại.
     * - Emit WalletArrearsClearedEvent để User Service / Booking Service / Charging Service
     *   tự check xem user có nợ không và unlock nếu balance đủ.
     *
     * Flow:
     *   wallet.topup.completed → [Payment] → WalletArrearsClearedEvent
     *                          → [User Service] check arrears → unlock nếu đủ tiền
     *                          → [Booking Service] unblock ArrearsGuard
     *                          → [Charging Service] unblock ChargingArrearsGuard
     */
    await this.dataSource.transaction(async (manager) => {
      const wallet = await this.walletRepo.findByUserId(payload.userId);
      if (!wallet) return;

      const currentBalance = await this.walletRepo.getBalance(wallet.id, manager);

      // Emit event cho các service khác kiểm tra arrears
      // Chỉ emit nếu topup có giá trị đáng kể (> 1000 VND)
      if (payload.amount > 1000) {
        const clearEvent = new WalletArrearsClearedEvent(payload.userId, wallet.id);
        await this.eventBus.publishAll([clearEvent], manager);

        this.logger.log(
          `Wallet topup: user=${payload.userId} amount=${payload.amount}VND ` +
          `balance=${currentBalance}VND — WalletArrearsClearedEvent emitted for downstream check`,
        );
      }
    });
  }
}




