import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE event_outbox_status_enum AS ENUM ('pending', 'processed', 'failed');
CREATE TYPE plans_plan_type_enum AS ENUM ('basic', 'standard', 'premium');
CREATE TYPE subscriptions_status_enum AS ENUM ('pending', 'active', 'cancelled', 'expired');
CREATE TYPE transactions_method_enum AS ENUM ('wallet', 'bank_transfer', 'cash');
CREATE TYPE transactions_related_type_enum AS ENUM ('subscription', 'booking', 'charging_session', 'guest_charging');
CREATE TYPE transactions_status_enum AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE transactions_type_enum AS ENUM ('topup', 'payment', 'refund');
CREATE TYPE wallets_status_enum AS ENUM ('active', 'suspended', 'closed');

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    status wallets_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type transactions_type_enum NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    method transactions_method_enum NOT NULL,
    related_id UUID,
    related_type transactions_related_type_enum,
    external_id VARCHAR(100),
    reference_code VARCHAR(100) UNIQUE,
    status transactions_status_enum NOT NULL DEFAULT 'pending',
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tx_user_date ON transactions (user_id, created_at);
CREATE INDEX idx_tx_status ON transactions (status, created_at);
CREATE INDEX idx_tx_ref ON transactions (reference_code) WHERE reference_code IS NOT NULL;

CREATE TABLE wallet_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL,
    transaction_id UUID NOT NULL UNIQUE,
    delta_amount NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_wallet ON wallet_ledger (wallet_id, created_at);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    due_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_user_st ON invoices (user_id, status);

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    plan_type plans_plan_type_enum NOT NULL DEFAULT 'basic',
    price_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price_currency CHAR(3) NOT NULL DEFAULT 'VND',
    duration_days INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    status subscriptions_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_user_st ON subscriptions (user_id, status);
CREATE INDEX idx_sub_expires ON subscriptions (end_date) WHERE status = 'active';

CREATE TABLE user_read_models (
    user_id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status event_outbox_status_enum NOT NULL DEFAULT 'pending',
    retry_count SMALLINT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON event_outbox (status, created_at) WHERE status = 'pending';

CREATE TABLE processed_events (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert schema
  }
}
