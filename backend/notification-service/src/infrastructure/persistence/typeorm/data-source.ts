import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { NotificationOrmEntity, ProcessedEventOrmEntity } from './entities/notification.orm-entities';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5438'),
  username: process.env.DB_USER ?? 'ev_user',
  password: process.env.DB_PASSWORD ?? 'ev_secret',
  database: process.env.DB_NAME ?? 'ev_notification_db',
  entities: [NotificationOrmEntity, ProcessedEventOrmEntity],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
