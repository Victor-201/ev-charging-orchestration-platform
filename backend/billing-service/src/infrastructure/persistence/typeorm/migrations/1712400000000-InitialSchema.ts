import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712400000000 implements MigrationInterface {
  name = 'InitialSchema1712400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Payment methods (BCNF: type data separate from user, no card data in transactions) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL,
        type        VARCHAR(20) NOT NULL CHECK (type IN ('card','wallet','bank_transfer','zalopay','momo')),
        provider    VARCHAR(50),
        last4       VARCHAR(4),
        holder_name VARCHAR(200),
        is_default  BOOLEAN NOT NULL DEFAULT FALSE,
        metadata    JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_pm_user ON payment_methods (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_pm_default ON payment_methods (user_id, is_default) WHERE is_default = TRUE`);

    // ─── Pricing rules (normalized: separate from invoices — invoice references rule snapshot) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pricing_rules (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id        UUID,
        connector_type    VARCHAR(20),
        price_per_kwh_vnd BIGINT NOT NULL DEFAULT 3500,
        price_per_min_vnd BIGINT NOT NULL DEFAULT 0,
        peak_multiplier   DECIMAL(4,2) NOT NULL DEFAULT 1.00,
        idle_fee_per_min  BIGINT NOT NULL DEFAULT 0,
        effective_from    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        effective_to      TIMESTAMPTZ,
        is_active         BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_price_station ON pricing_rules (station_id, is_active)`);
    await queryRunner.query(`CREATE INDEX idx_price_active ON pricing_rules (effective_from, effective_to) WHERE is_active = TRUE`);

    // ─── Invoices (1:1 with session) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id        UUID NOT NULL UNIQUE,
        user_id           UUID NOT NULL,
        kwh_consumed      DECIMAL(10,4) NOT NULL,
        duration_minutes  DECIMAL(10,2) NOT NULL,
        energy_amount_vnd BIGINT NOT NULL DEFAULT 0,
        time_amount_vnd   BIGINT NOT NULL DEFAULT 0,
        discount_vnd      BIGINT NOT NULL DEFAULT 0,
        total_amount_vnd  BIGINT NOT NULL,
        currency          VARCHAR(3) NOT NULL DEFAULT 'VND',
        status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','paid','void','refunding','refunded')),
        due_date          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
        paid_at           TIMESTAMPTZ,
        pricing_rule_id   UUID REFERENCES pricing_rules(id) ON DELETE RESTRICT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_invoice_user ON invoices (user_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_invoice_session ON invoices (session_id)`);
    await queryRunner.query(`CREATE INDEX idx_invoice_pending ON invoices (due_date) WHERE status = 'pending'`);

    // ─── Transactions (normalized: each charge/refund is own row, no repeated user data) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id      UUID NOT NULL REFERENCES invoices(id),
        user_id         UUID NOT NULL,
        payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
        amount_vnd      BIGINT NOT NULL,
        type            VARCHAR(20) NOT NULL CHECK (type IN ('charge','refund','adjustment')),
        status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','completed','failed','cancelled')),
        provider        VARCHAR(50),
        provider_ref    VARCHAR(255),
        error_message   VARCHAR(500),
        metadata        JSONB NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at    TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_txn_invoice ON payment_transactions (invoice_id)`);
    await queryRunner.query(`CREATE INDEX idx_txn_user ON payment_transactions (user_id, status)`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_txn_provider_ref ON payment_transactions (provider, provider_ref) WHERE provider_ref IS NOT NULL`);

    // ─── Idempotent events ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id     VARCHAR(255) PRIMARY KEY,
        event_type   VARCHAR(100) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Outbox ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS event_outbox (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        aggregate_type VARCHAR(100) NOT NULL,
        aggregate_id   UUID NOT NULL,
        event_type     VARCHAR(100) NOT NULL,
        payload        JSONB NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','published','failed')),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        published_at   TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_outbox_pending ON event_outbox (status, created_at) WHERE status = 'pending'`);

    // ─── Seed pricing rules ───
    await queryRunner.query(`
      INSERT INTO pricing_rules (id, station_id, connector_type, price_per_kwh_vnd, price_per_min_vnd, peak_multiplier) VALUES
      ('g0000000-0000-0000-0000-000000000001',NULL,'CCS2',4200,0,1.30),
      ('g0000000-0000-0000-0000-000000000002',NULL,'Type2',3800,200,1.20),
      ('g0000000-0000-0000-0000-000000000003',NULL,'CHAdeMO',4000,0,1.25),
      ('g0000000-0000-0000-0000-000000000004',NULL,'Tesla',4300,0,1.20),
      ('g0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','CCS2',4200,0,1.30)
      ON CONFLICT DO NOTHING
    `);

    /* Seed invoices for seeded sessions */
    await queryRunner.query(`
      INSERT INTO invoices (id, session_id, user_id, kwh_consumed, duration_minutes, energy_amount_vnd, time_amount_vnd, total_amount_vnd, status, paid_at) VALUES
      ('h0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',145.0,90,609000,0,609000,'paid',NOW()-INTERVAL '2 days'+INTERVAL '2 hours'),
      ('h0000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003',230.0,120,1035000,0,1035000,'paid',NOW()-INTERVAL '1 day'+INTERVAL '3 hours'),
      ('h0000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',56.0,45,228480,9000,237480,'paid',NOW()-INTERVAL '3 days'+INTERVAL '1 hour'),
      ('h0000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000007',180.0,120,756000,0,756000,'paid',NOW()-INTERVAL '3 hours')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS event_outbox CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS processed_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_transactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoices CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS pricing_rules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_methods CASCADE`);
  }
}
