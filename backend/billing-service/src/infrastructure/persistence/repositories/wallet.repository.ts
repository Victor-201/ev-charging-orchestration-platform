import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Wallet, WalletStatus } from '../../../domain/entities/wallet.aggregate';
import { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { WalletOrmEntity } from '../typeorm/entities/payment.orm-entities';

@Injectable()
export class WalletRepository implements IWalletRepository {
  constructor(
    @InjectRepository(WalletOrmEntity)
    private readonly repo: Repository<WalletOrmEntity>,
  ) {}

  async findById(id: string): Promise<Wallet | null> {
    const e = await this.repo.findOneBy({ id });
    return e ? this.toDomain(e) : null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const e = await this.repo.findOneBy({ userId });
    return e ? this.toDomain(e) : null;
  }

  async save(wallet: Wallet, manager?: EntityManager): Promise<void> {
    const entity = this.toOrm(wallet);
    if (manager) {
      await manager.save(WalletOrmEntity, entity);
    } else {
      await this.repo.save(entity);
    }
  }

  async getBalance(walletId: string, manager?: EntityManager): Promise<number> {
    const em = manager ?? this.repo.manager;
    const result: { balance: string }[] = await em.query(
      `SELECT COALESCE(SUM(delta_amount), 0) AS balance
       FROM wallet_ledger WHERE wallet_id = $1`,
      [walletId],
    );
    return parseFloat(result[0]?.balance ?? '0');
  }

  async lockForUpdate(walletId: string, manager: EntityManager): Promise<void> {
    await manager.query(
      `SELECT id FROM wallets WHERE id = $1 AND status = 'active' FOR UPDATE`,
      [walletId],
    );
  }

  /**
   * Adds credit to the wallet ledger.
   * Requires wallet to be locked first (lockForUpdate).
   */
  async credit(
    walletId: string,
    transactionId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<number> {
    const currentBalance = await this.getBalance(walletId, manager);
    const newBalance = currentBalance + amount;
    
    await manager.query(
      `INSERT INTO wallet_ledger (wallet_id, transaction_id, delta_amount, balance_after)
       VALUES ($1, $2, $3, $4)`,
      [walletId, transactionId, amount, newBalance]
    );
    
    return newBalance;
  }

  /**
   * Deducts from the wallet ledger.
   * Requires wallet to be locked first (lockForUpdate).
   */
  async debit(
    walletId: string,
    transactionId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<number> {
    const currentBalance = await this.getBalance(walletId, manager);
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient balance: current=${currentBalance}, requested=${amount}`);
    }
    
    const newBalance = currentBalance - amount;
    
    await manager.query(
      `INSERT INTO wallet_ledger (wallet_id, transaction_id, delta_amount, balance_after)
       VALUES ($1, $2, $3, $4)`,
      [walletId, transactionId, -amount, newBalance]
    );
    
    return newBalance;
  }

  private toOrm(w: Wallet): WalletOrmEntity {
    const e = new WalletOrmEntity();
    e.id       = w.id;
    e.userId   = w.userId;
    e.currency = w.currency;
    e.status   = w.status;
    return e;
  }

  private toDomain(e: WalletOrmEntity): Wallet {
    return Wallet.reconstitute({
      id:        e.id,
      userId:    e.userId,
      currency:  e.currency,
      status:    e.status as WalletStatus,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }
}
