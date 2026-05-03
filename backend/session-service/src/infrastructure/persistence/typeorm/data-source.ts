import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { BookingOrmEntity } from './entities/booking.orm-entity';
import { ChargerOrmEntity } from './entities/charger.orm-entity';
import { QueueOrmEntity } from './entities/queue.orm-entity';
import { OutboxOrmEntity } from '../../messaging/outbox/outbox.orm-entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'ev_user',
  password: process.env.DB_PASSWORD || 'ev_secret',
  database: process.env.DB_NAME || 'ev_booking_db',
  entities: [BookingOrmEntity, ChargerOrmEntity, QueueOrmEntity, OutboxOrmEntity],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  poolSize: 20,
  connectTimeoutMS: 3000,
  extra: {
    idleTimeoutMillis: 30000,
    max: 20,
  },
});
