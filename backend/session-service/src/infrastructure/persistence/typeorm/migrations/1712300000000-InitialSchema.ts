import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712300000000 implements MigrationInterface {
  name = 'InitialSchema1712300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Charging sessions (BCNF: no user/charger data duplicated) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charging_sessions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id      UUID UNIQUE,
        user_id         UUID NOT NULL,
        charger_id      UUID NOT NULL,
        start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        end_time        TIMESTAMPTZ,
        start_meter_wh  BIGINT NOT NULL DEFAULT 0,
        end_meter_wh    BIGINT,
        kwh_consumed    DECIMAL(10,4) GENERATED ALWAYS AS (
                          CASE WHEN end_meter_wh IS NOT NULL
                          THEN (end_meter_wh - start_meter_wh)::DECIMAL / 1000
                          ELSE NULL END
                        ) STORED,
        status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('pending','active','completed','error','interrupted')),
        error_reason    VARCHAR(500),
        initiated_by    VARCHAR(20) NOT NULL DEFAULT 'user'
                        CHECK (initiated_by IN ('user','system','staff')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_session_user ON charging_sessions (user_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_session_charger ON charging_sessions (charger_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_session_booking ON charging_sessions (booking_id) WHERE booking_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX idx_session_active ON charging_sessions (charger_id, start_time) WHERE status = 'active'`);

    // ─── Telemetry (time-series, separate table for size management) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS session_telemetry (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id   UUID NOT NULL REFERENCES charging_sessions(id) ON DELETE CASCADE,
        recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        power_kw     DECIMAL(8,3),
        meter_wh     BIGINT,
        voltage_v    DECIMAL(7,2),
        current_a    DECIMAL(7,3),
        temperature_c DECIMAL(5,2),
        soc_percent  SMALLINT CHECK (soc_percent BETWEEN 0 AND 100),
        error_code   VARCHAR(50)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_telemetry_session ON session_telemetry (session_id, recorded_at DESC)`);

    // ─── OCPP command log (normalized: payload in JSONB avoids columns per command type) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ocpp_commands (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id       UUID REFERENCES charging_sessions(id) ON DELETE SET NULL,
        charger_id       UUID NOT NULL,
        command_type     VARCHAR(50) NOT NULL,
        payload          JSONB NOT NULL DEFAULT '{}',
        status           VARCHAR(20) NOT NULL DEFAULT 'sent'
                         CHECK (status IN ('sent','acknowledged','accepted','rejected','timeout')),
        sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        response_at      TIMESTAMPTZ,
        response_payload JSONB
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_ocpp_session ON ocpp_commands (session_id, sent_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_ocpp_charger ON ocpp_commands (charger_id, command_type)`);

    // ─── Idempotent event processing table ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id    VARCHAR(255) PRIMARY KEY,
        event_type  VARCHAR(100) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_pe_type ON processed_events (event_type)`);

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

    /* Seed: 5 past sessions for analytics */
    await queryRunner.query(`
      INSERT INTO charging_sessions (id, booking_id, user_id, charger_id, start_time, end_time, start_meter_wh, end_meter_wh, status) VALUES
      ('f0000000-0000-0000-0000-000000000001',NULL,'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',NOW()-INTERVAL '2 days',NOW()-INTERVAL '2 days'+INTERVAL '1.5 hours',100000,245000,'completed'),
      ('f0000000-0000-0000-0000-000000000002',NULL,'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000005',NOW()-INTERVAL '1 day',NOW()-INTERVAL '1 day'+INTERVAL '2 hours',200000,430000,'completed'),
      ('f0000000-0000-0000-0000-000000000003',NULL,'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000009',NOW()-INTERVAL '3 days',NOW()-INTERVAL '3 days'+INTERVAL '45 minutes',300000,356000,'completed'),
      ('f0000000-0000-0000-0000-000000000004',NULL,'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000006',NOW()-INTERVAL '4 hours',NOW()-INTERVAL '2 hours',150000,330000,'completed'),
      ('f0000000-0000-0000-0000-000000000005',NULL,'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000010',NOW()-INTERVAL '1 hour',NULL,0,NULL,'active')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS event_outbox CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS processed_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ocpp_commands CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS session_telemetry CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS charging_sessions CASCADE`);
  }
}
