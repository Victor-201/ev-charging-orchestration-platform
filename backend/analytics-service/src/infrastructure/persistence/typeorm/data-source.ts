import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { EventLogOrmEntity, DailyStationMetricsOrmEntity, DailyUserMetricsOrmEntity, KpiSnapshotOrmEntity, ProcessedEventOrmEntity } from './entities/analytics.orm-entities';
import { InitialSchema1712600000000 } from './migrations/1712600000000-InitialSchema';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5440'),
  username: process.env.DB_USER ?? 'ev_user',
  password: process.env.DB_PASSWORD ?? 'ev_secret',
  database: process.env.DB_NAME ?? 'ev_analytics_db',
  entities: [EventLogOrmEntity, DailyStationMetricsOrmEntity, DailyUserMetricsOrmEntity, KpiSnapshotOrmEntity, ProcessedEventOrmEntity],
  migrations: [InitialSchema1712600000000],
  synchronize: false,
  logging: true,
});
