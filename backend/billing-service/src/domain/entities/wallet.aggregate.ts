import * as crypto from 'crypto';
/**
 * Wallet Aggregate Root
 *
 * Invariants:
 * - One wallet per user (enforced by DB unique constraint on user_id)
 * - Balance is NEVER stored in the aggregate — always recomputed from ledger
 * - status FSM: active → suspended → active | closed (terminal)
 */
export type WalletStatus = 'active' | 'suspended' | 'closed';

export class WalletDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletDomainException';
  }
}

export class InsufficientBalanceException extends WalletDomainException {
  constructor(current: number, requested: number) {
    super(`Insufficient balance: current=${current}, requested=${requested}`);
    this.name = 'InsufficientBalanceException';
  }
}

export class WalletClosedException extends WalletDomainException {
  constructor() {
    super('Wallet is closed and cannot be used');
    this.name = 'WalletClosedException';
  }
}

export class Wallet {
  readonly id: string;
  readonly userId: string;
  readonly currency: string;
  readonly createdAt: Date;

  private _status: WalletStatus;
  private _updatedAt: Date;

  private constructor(props: {
    id: string;
    userId: string;
    currency: string;
    status: WalletStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id         = props.id;
    this.userId     = props.userId;
    this.currency   = props.currency;
    this._status    = props.status;
    this.createdAt  = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: { userId: string; currency?: string }): Wallet {
    return new Wallet({
      id:        crypto.randomUUID(),
      userId:    props.userId,
      currency:  props.currency ?? 'VND',
      status:    'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: {
    id: string;
    userId: string;
    currency: string;
    status: WalletStatus;
    createdAt: Date;
    updatedAt: Date;
  }): Wallet {
    return new Wallet(props);
  }

  /**
   * Validate debit — throws if insufficient or wallet not active.
   * Actual ledger write happens in WalletRepository via stored procedure.
   */
  validateDebit(amount: number, currentBalance: number): void {
    if (this._status === 'closed') throw new WalletClosedException();
    if (this._status !== 'active') {
      throw new WalletDomainException('Wallet is not active');
    }
    if (amount <= 0) throw new WalletDomainException('Debit amount must be positive');
    if (currentBalance < amount) throw new InsufficientBalanceException(currentBalance, amount);
  }

  validateCredit(amount: number): void {
    if (this._status === 'closed') throw new WalletClosedException();
    if (amount <= 0) throw new WalletDomainException('Credit amount must be positive');
  }

  suspend(): void {
    if (this._status === 'closed') throw new WalletClosedException();
    this._status    = 'suspended';
    this._updatedAt = new Date();
  }

  activate(): void {
    if (this._status === 'closed') throw new WalletClosedException();
    this._status    = 'active';
    this._updatedAt = new Date();
  }

  close(): void {
    this._status    = 'closed';
    this._updatedAt = new Date();
  }

  get status():    WalletStatus { return this._status; }
  get updatedAt(): Date         { return this._updatedAt; }
}
