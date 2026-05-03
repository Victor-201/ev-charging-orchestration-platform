import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import {
  StationOrmEntity, ChargingPointOrmEntity, ConnectorOrmEntity, CityOrmEntity,
  PricingRuleOrmEntity, MaintenanceOrmEntity, IncidentOrmEntity,
  ProcessedEventOrmEntity, OutboxOrmEntity,
} from './entities/station.orm-entities';

export default new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     parseInt(process.env.DB_PORT ?? '5435'),
  username: process.env.DB_USER     ?? 'ev_user',
  password: process.env.DB_PASSWORD ?? 'ev_secret',
  database: process.env.DB_NAME     ?? 'ev_infrastructure_db',
  entities: [
    StationOrmEntity, ChargingPointOrmEntity, ConnectorOrmEntity, CityOrmEntity,
    PricingRuleOrmEntity, MaintenanceOrmEntity, IncidentOrmEntity,
    ProcessedEventOrmEntity, OutboxOrmEntity,
  ],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false,
  logging: true,
});

