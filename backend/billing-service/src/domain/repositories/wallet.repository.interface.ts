import { EntityManager } from 'typeorm';
import { Wallet } from '../entities/wallet.aggregate';

export interface IWalletRepository {
  findById(id: string): Promise<Wallet | null>;
  findByUserId(userId: string): Promise<Wallet | null>;
  save(wallet: Wallet, manager?: EntityManager): Promise<void>;
  /** Returns current balance via MAX(balance_after) from wallet_ledger */
  getBalance(walletId: string, manager?: EntityManager): Promise<number>;
  /** Acquired row-level lock — call inside transaction */
  lockForUpdate(walletId: string, manager: EntityManager): Promise<void>;
  /** Calls DB stored procedure credit_wallet */
  credit(walletId: string, transactionId: string, amount: number, manager: EntityManager): Promise<number>;
  /** Calls DB stored procedure debit_wallet */
  debit(walletId: string, transactionId: string, amount: number, manager: EntityManager): Promise<number>;
}

export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');
