import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../../domain/entities/transaction.aggregate';
import { Wallet } from '../../domain/entities/wallet.aggregate';
import {
  PaymentCompletedEvent, PaymentFailedEvent,
  WalletTopupCompletedEvent,
} from '../../domain/events/payment.events';
import {
  IWalletRepository, WALLET_REPOSITORY,
} from '../../domain/repositories/wallet.repository.interface';
import {
  ITransactionRepository, TRANSACTION_REPOSITORY,
} from '../../domain/repositories/transaction.repository.interface';
import { VNPayService, VNPayReturnParams } from '../../infrastructure/vnpay/vnpay.service';
import {
  EVENT_BUS, IPaymentEventBus,
} from '../../infrastructure/messaging/outbox-event-bus';
import {
  ProcessedEventOrmEntity, InvoiceOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/payment.orm-entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// ─── CreatePaymentUseCase ─────────────────────────────────────────────────────

/**
 * Creates a pending Transaction and returns a VNPay payment URL.
 * No wallet deduction at this stage — payment is confirmed via VNPay callback.
 *
 * Flow:
 *  1. Create Transaction (pending)
 *  2. Attach VNPay reference code
 *  3. Save atomically
 *  4. Return VNPay payment URL
 */
@Injectable()
export class CreatePaymentUseCase {
  private readonly logger = new Logger(CreatePaymentUseCase.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    private readonly vnpay: VNPayService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async execute(cmd: {
    userId: string;
    bookingId: string;
    amount: number;  // VND
    ipAddr?: string;
    bankCode?: string;
  }): Promise<{ transactionId: string; paymentUrl: string }> {
    const returnUrl = this.config.get('VNPAY_RETURN_URL', 'http://localhost:3005/api/v1/payments/vnpay-return');

    // Create transaction record
    const txn = Transaction.create({
      userId:      cmd.userId,
      type:        'payment',
      amount:      cmd.amount,
      method:      'bank_transfer',
      relatedId:   cmd.bookingId,
      relatedType: 'booking',
    });

    // Generate unique txn ref for VNPay (max 100 chars)
    const txnRef = `EV${txn.id.replace(/-/g, '').substring(0, 16).toUpperCase()}`;
    const orderInfo = `Thanh toan dat san EV ${cmd.bookingId.substring(0, 8)}`;

    const paymentUrl = this.vnpay.buildPaymentUrl({
      amount:    cmd.amount,
      orderInfo,
      orderType: 'billpayment',
      txnRef,
      returnUrl,
      ipAddr:    cmd.ipAddr,
      bankCode:  cmd.bankCode,
    });

    txn.attachVNPayRef(txnRef, { bookingId: cmd.bookingId, orderInfo });

    await this.txRepo.save(txn);

    this.logger.log(`Payment initiated: tx=${txn.id} ref=${txnRef} amount=${cmd.amount}`);
    return { transactionId: txn.id, paymentUrl };
  }
}

// ─── HandleVNPayCallbackUseCase ───────────────────────────────────────────────

/**
 * Processes VNPay return/IPN callback.
 *
 * Security:
 * - Validates HMAC SHA512 checksum (rejects if invalid)
 * - Idempotent: processed_events table prevents double-processing
 *
 * Flow:
 *  1. Verify checksum → throw if invalid
 *  2. Idempotency check (processed_events)
 *  3. Find transaction by referenceCode
 *  4. Update status (completed / failed)
 *  5. Publish PaymentCompleted or PaymentFailed event to outbox
 *  6. Generate invoice
 *  7. Mark event as processed
 */
@Injectable()
export class HandleVNPayCallbackUseCase {
  private readonly logger = new Logger(HandleVNPayCallbackUseCase.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    private readonly vnpay: VNPayService,
    private readonly dataSource: DataSource,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(InvoiceOrmEntity)
    private readonly invoiceRepo: Repository<InvoiceOrmEntity>,
  ) {}

  async execute(params: VNPayReturnParams): Promise<{ status: 'success' | 'failed'; transactionId: string }> {
    // ── STEP 1: Validate checksum (security gate) ──────────────────────────
    const result = this.vnpay.verifyCallback(params); // throws on invalid

    const eventId = `vnpay:${result.txnRef}:${result.payDate}`;

    // ── STEP 2: Idempotency check ──────────────────────────────────────────
    const alreadyProcessed = await this.processedRepo.existsBy({ eventId });
    if (alreadyProcessed) {
      this.logger.warn(`Duplicate VNPay callback: ${eventId}`);
      const tx = await this.txRepo.findByReferenceCode(result.txnRef);
      return { status: tx?.status === 'completed' ? 'success' : 'failed', transactionId: tx?.id ?? '' };
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      // ── STEP 3: Find transaction ─────────────────────────────────────────
      const tx = await this.txRepo.findByReferenceCode(result.txnRef);
      if (!tx) {
        this.logger.error(`Transaction not found for txnRef=${result.txnRef}`);
        throw new Error(`Transaction not found: ${result.txnRef}`);
      }

      // ── STEP 4: Update transaction status ───────────────────────────────
      const events = [];
      if (result.isSuccess) {
        tx.complete(result.transactionNo);
        events.push(new PaymentCompletedEvent(
          tx.id, tx.userId, tx.amount, tx.relatedId, tx.relatedType,
        ));
      } else {
        tx.fail(`VNPay responseCode=${result.responseCode}`);
        events.push(new PaymentFailedEvent(tx.id, tx.userId, `VNPay code ${result.responseCode}`));
      }

      await this.txRepo.save(tx, manager);

      // ── STEP 5: Publish to outbox ────────────────────────────────────────
      await this.eventBus.publishAll(events, manager);

      // ── STEP 6: Generate invoice (if payment success) ────────────────────
      if (result.isSuccess) {
        const invoice = manager.create(InvoiceOrmEntity, {
          id:            uuidv4(),
          transactionId: tx.id,
          userId:        tx.userId,
          totalAmount:   tx.amount,
          dueDate:       null,
          status:        'paid',
        });
        await manager.save(InvoiceOrmEntity, invoice);
      }

      // ── STEP 7: Mark as processed ────────────────────────────────────────
      await manager.save(ProcessedEventOrmEntity, {
        eventId,
        eventType: 'vnpay.callback',
      });

      this.logger.log(`VNPay callback processed: tx=${tx.id} success=${result.isSuccess}`);
      return { status: result.isSuccess ? 'success' : 'failed', transactionId: tx.id };
    });
  }
}

// ─── WalletTopupUseCase ───────────────────────────────────────────────────────

/**
 * Initiate VNPay payment to top up wallet balance.
 * Actual credit happens in HandleVNPayCallbackUseCase after payment confirmed.
 */
@Injectable()
export class WalletTopupInitUseCase {
  private readonly logger = new Logger(WalletTopupInitUseCase.name);

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    private readonly vnpay: VNPayService,
    private readonly config: ConfigService,
  ) {}

  async execute(cmd: {
    userId: string;
    amount: number;
    ipAddr?: string;
    bankCode?: string;
  }): Promise<{ transactionId: string; paymentUrl: string }> {
    let wallet = await this.walletRepo.findByUserId(cmd.userId);
    if (!wallet) {
      wallet = Wallet.create({ userId: cmd.userId });
      await this.walletRepo.save(wallet);
    }

    wallet.validateCredit(cmd.amount);

    const txn = Transaction.create({
      userId: cmd.userId,
      type:   'topup',
      amount: cmd.amount,
      method: 'bank_transfer',
    });

    const txnRef   = `TOPUP${txn.id.replace(/-/g, '').substring(0, 14).toUpperCase()}`;
    const returnUrl = this.config.get('VNPAY_RETURN_URL', 'http://localhost:3005/api/v1/payments/vnpay-return');

    const paymentUrl = this.vnpay.buildPaymentUrl({
      amount:    cmd.amount,
      orderInfo: `Nap tien vi EV user ${cmd.userId.substring(0, 8)}`,
      orderType: 'topup',
      txnRef,
      returnUrl,
      ipAddr:    cmd.ipAddr,
      bankCode:  cmd.bankCode,
    });

    txn.attachVNPayRef(txnRef, { walletId: wallet.id, type: 'topup' });
    await this.txRepo.save(txn);

    return { transactionId: txn.id, paymentUrl };
  }
}

// ─── WalletPayUseCase (wallet direct payment) ─────────────────────────────────

@Injectable()
export class WalletPayUseCase {
  private readonly logger = new Logger(WalletPayUseCase.name);

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    private readonly dataSource: DataSource,
    @InjectRepository(InvoiceOrmEntity)
    private readonly invoiceRepo: Repository<InvoiceOrmEntity>,
  ) {}

  async execute(cmd: {
    userId: string;
    bookingId: string;
    amount: number;
  }): Promise<{ transactionId: string; balanceAfter: number }> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const wallet = await this.walletRepo.findByUserId(cmd.userId);
      if (!wallet) throw new Error('Wallet not found — user must create wallet first');

      // Lock wallet row
      await this.walletRepo.lockForUpdate(wallet.id, manager);

      // Get current balance
      const balance = await this.walletRepo.getBalance(wallet.id, manager);

      // Domain validation (throws InsufficientBalanceException)
      wallet.validateDebit(cmd.amount, balance);

      // Create transaction
      const txn = Transaction.create({
        userId:      cmd.userId,
        type:        'payment',
        amount:      cmd.amount,
        method:      'wallet',
        relatedId:   cmd.bookingId,
        relatedType: 'booking',
      });
      await this.txRepo.save(txn, manager);

      // Debit wallet via stored procedure (row-lock + ledger append atomic)
      const balanceAfter = await this.walletRepo.debit(wallet.id, txn.id, cmd.amount, manager);

      txn.complete();
      await this.txRepo.save(txn, manager);

      // Publish event
      const event = new PaymentCompletedEvent(txn.id, cmd.userId, cmd.amount, cmd.bookingId, 'booking');
      await this.eventBus.publishAll([event], manager);

      // Generate invoice
      await manager.save(InvoiceOrmEntity, manager.create(InvoiceOrmEntity, {
        id:            uuidv4(),
        transactionId: txn.id,
        userId:        cmd.userId,
        totalAmount:   cmd.amount,
        dueDate:       null,
        status:        'paid',
      }));

      this.logger.log(`Wallet payment completed: tx=${txn.id} amount=${cmd.amount} balance=${balanceAfter}`);
      return { transactionId: txn.id, balanceAfter };
    });
  }
}

// ─── GetWalletBalanceUseCase ──────────────────────────────────────────────────

@Injectable()
export class GetWalletBalanceUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly walletRepo: IWalletRepository,
  ) {}

  async execute(userId: string): Promise<{ walletId: string; balance: number; currency: string }> {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) return { walletId: '', balance: 0, currency: 'VND' };
    const balance = await this.walletRepo.getBalance(wallet.id);
    return { walletId: wallet.id, balance, currency: wallet.currency };
  }
}

// ─── GetTransactionHistoryUseCase ─────────────────────────────────────────────

@Injectable()
export class GetTransactionHistoryUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
  ) {}

  async execute(userId: string, limit = 20, offset = 0): Promise<Transaction[]> {
    return this.txRepo.findByUserId(userId, limit, offset);
  }
}

// ─── GetPaymentUseCase ────────────────────────────────────────────────────────

@Injectable()
export class GetPaymentUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
  ) {}

  async execute(transactionId: string): Promise<Transaction | null> {
    return this.txRepo.findById(transactionId);
  }
}

// ─── PaymentOrchestratorUseCase ───────────────────────────────────────────────
// Strategy: try wallet first, fallback to VNPay gateway
// Idempotency: if idempotencyKey already processed → return cached result

@Injectable()
export class PaymentOrchestratorUseCase {
  private readonly logger = new Logger(PaymentOrchestratorUseCase.name);

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    private readonly walletPay: WalletPayUseCase,
    private readonly createPayment: CreatePaymentUseCase,
    private readonly dataSource: DataSource,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
  ) {}

  async execute(cmd: {
    userId: string;
    sessionId: string;
    bookingId: string;
    amount: number;
    idempotencyKey: string;
    ipAddr?: string;
  }): Promise<{
    method: 'wallet' | 'gateway';
    transactionId: string;
    paymentUrl?: string;
    balanceAfter?: number;
    status: string;
  }> {
    // Idempotency: check if already processed
    const cached = await this.processedRepo.findOne({
      where: { eventId: `orchestrator:${cmd.idempotencyKey}` },
    });
    if (cached) {
      this.logger.warn(`Idempotent payment request: ${cmd.idempotencyKey}`);
      const tx = await this.txRepo.findByReferenceCode(cmd.idempotencyKey);
      return {
        method: tx?.method === 'wallet' ? 'wallet' : 'gateway',
        transactionId: tx?.id ?? '',
        status: tx?.status ?? 'unknown',
      };
    }

    // Try wallet payment first
    try {
      const wallet = await this.walletRepo.findByUserId(cmd.userId);
      if (wallet) {
        const balance = await this.walletRepo.getBalance(wallet.id);
        if (balance >= cmd.amount) {
          const result = await this.walletPay.execute({
            userId: cmd.userId,
            bookingId: cmd.bookingId,
            amount: cmd.amount,
          });

          await this.processedRepo.save({
            eventId: `orchestrator:${cmd.idempotencyKey}`,
            eventType: 'payment.orchestrated.wallet',
          });

          this.logger.log(`Payment orchestrated via wallet: ${result.transactionId}`);
          return { method: 'wallet', transactionId: result.transactionId, balanceAfter: result.balanceAfter, status: 'completed' };
        }
      }
    } catch (err) {
      this.logger.warn(`Wallet payment failed, falling back to gateway: ${err}`);
    }

    // Fallback: VNPay gateway
    const result = await this.createPayment.execute({
      userId: cmd.userId,
      bookingId: cmd.bookingId,
      amount: cmd.amount,
      ipAddr: cmd.ipAddr,
    });

    await this.processedRepo.save({
      eventId: `orchestrator:${cmd.idempotencyKey}`,
      eventType: 'payment.orchestrated.gateway',
    });

    this.logger.log(`Payment orchestrated via gateway: ${result.transactionId}`);
    return { method: 'gateway', transactionId: result.transactionId, paymentUrl: result.paymentUrl, status: 'pending' };
  }
}

// ─── RefundUseCase ────────────────────────────────────────────────────────────

@Injectable()
export class RefundUseCase {
  private readonly logger = new Logger(RefundUseCase.name);

  constructor(
    @Inject(WALLET_REPOSITORY)      private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS)              private readonly eventBus: IPaymentEventBus,
    private readonly dataSource: DataSource,
    @InjectRepository(InvoiceOrmEntity)
    private readonly invoiceRepo: Repository<InvoiceOrmEntity>,
  ) {}

  async execute(cmd: {
    originalTransactionId: string;
    reason: string;
    refundedBy?: string;
  }): Promise<{ refundTransactionId: string }> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const originalTx = await this.txRepo.findById(cmd.originalTransactionId);
      if (!originalTx) throw new Error(`Transaction ${cmd.originalTransactionId} not found`);
      if (originalTx.status !== 'completed') {
        throw new Error(`Cannot refund transaction in status: ${originalTx.status}`);
      }

      const refundTxn = Transaction.create({
        userId:      originalTx.userId,
        type:        'refund',
        amount:      originalTx.amount,
        method:      originalTx.method,
        relatedId:   cmd.originalTransactionId,
        relatedType: 'charging_session',
      });

      await this.txRepo.save(refundTxn, manager);

      // If original was wallet payment → credit back
      if (originalTx.method === 'wallet') {
        const wallet = await this.walletRepo.findByUserId(originalTx.userId);
        if (wallet) {
          await this.walletRepo.credit(wallet.id, refundTxn.id, originalTx.amount, manager);
        }
      }

      refundTxn.complete();
      await this.txRepo.save(refundTxn, manager);

      const event = new WalletTopupCompletedEvent(
        refundTxn.id,
        originalTx.userId,
        originalTx.amount,
        `Refund: ${cmd.reason}`,
      );
      await this.eventBus.publishAll([event], manager);

      this.logger.log(`Refund processed: ${refundTxn.id} for original ${cmd.originalTransactionId}`);
      return { refundTransactionId: refundTxn.id };
    });
  }
}

// ─── TransactionReconciliationJob ─────────────────────────────────────────────

@Injectable()
export class TransactionReconciliationJob {
  private readonly logger = new Logger(TransactionReconciliationJob.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
  ) {}

  // Called from @Cron in module
  async run(): Promise<void> {
    this.logger.log('Running transaction reconciliation...');

    /**
     * Booking PAYMENT_HOLD_MINUTES = 5 phút.
     * Giao dịch cọc của booking phải hoàn tất trong 5 phút.
     * Timeout = 7 phút = 5 phút hold + 2 phút xử lý buffer.
     * Các giao dịch khác (topup, refund) không bị ảnh hưởng vì chúng
     * hoàn thành gần như tức thì qua wallet hoặc VNPay IPN.
     */
    const BOOKING_DEPOSIT_TIMEOUT_MS = 7 * 60_000; // 7 phút
    const cutoff = new Date(Date.now() - BOOKING_DEPOSIT_TIMEOUT_MS);
    const stuckTxns = await this.txRepo.findPendingBefore(cutoff);

    for (const tx of stuckTxns) {
      tx.fail('Auto-cancelled: payment timeout after 7 minutes (booking expired)');
      await this.txRepo.save(tx);
      this.logger.warn(`Auto-cancelled stuck transaction: ${tx.id}`);
    }

    this.logger.log(`Reconciliation complete: cancelled ${stuckTxns.length} stuck transactions`);
  }
}

