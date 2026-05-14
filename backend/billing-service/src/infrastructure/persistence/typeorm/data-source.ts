import 'reflect-metadata';
import { DataSource } from 'typeorm';

import {
  InvoiceOrmEntity,
  TransactionOrmEntity,
  ProcessedEventOrmEntity,
  OutboxOrmEntity,
  WalletOrmEntity,
  WalletLedgerOrmEntity,
} from './entities/payment.orm-entities';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5439'),
  username: process.env.DB_USER ?? 'ev_user',
  password: process.env.DB_PASSWORD ?? 'ev_secret',
  database: process.env.DB_NAME ?? 'ev_billing_db',
  entities: [
    InvoiceOrmEntity,
    TransactionOrmEntity,
    ProcessedEventOrmEntity,
    OutboxOrmEntity,
    WalletOrmEntity,
    WalletLedgerOrmEntity,
  ],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false,
  logging: false,
});

