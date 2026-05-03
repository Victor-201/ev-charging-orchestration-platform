import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712200000000 implements MigrationInterface {
  name = 'InitialSchema1712200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Users Cache (from auth) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users_cache (
        user_id        UUID PRIMARY KEY,
        email          VARCHAR(255) NOT NULL,
        full_name      VARCHAR(100) NOT NULL,
        phone          VARCHAR(20),
        role_name      VARCHAR(50) NOT NULL DEFAULT 'user',
        status         VARCHAR(20) NOT NULL DEFAULT 'active',
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── User Profiles ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id    UUID PRIMARY KEY REFERENCES users_cache(user_id) ON DELETE CASCADE,
        avatar_url TEXT,
        address    TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── User FCM Tokens ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_fcm_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users_cache(user_id) ON DELETE CASCADE,
        fcm_token   TEXT NOT NULL UNIQUE,
        device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_user_fcm_tokens_user_id ON user_fcm_tokens (user_id)`);

    // ─── Vehicle Models ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicle_models (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand                VARCHAR(50) NOT NULL,
        model_name           VARCHAR(50) NOT NULL,
        year                 SMALLINT NOT NULL,
        battery_capacity_kwh NUMERIC(6,2),
        usable_capacity_kwh  NUMERIC(6,2),
        default_charge_port  VARCHAR(20) CHECK (default_charge_port IN ('CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Other')),
        max_ac_power_kw      NUMERIC(5,2),
        max_dc_power_kw      NUMERIC(5,2)
      )
    `);

    // ─── Vehicles ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id     UUID NOT NULL REFERENCES users_cache(user_id) ON DELETE CASCADE,
        model_id     UUID NOT NULL REFERENCES vehicle_models(id),
        plate_number VARCHAR(20) NOT NULL UNIQUE,
        color        VARCHAR(30),
        status       VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
        is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_vehicles_owner_status ON vehicles (owner_id, status)`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_vehicles_plate_number ON vehicles (plate_number)`);

    // ─── Staff Profiles ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS staff_profiles (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL UNIQUE REFERENCES users_cache(user_id) ON DELETE CASCADE,
        station_id   UUID NOT NULL,
        station_name VARCHAR(255),
        position     VARCHAR(50) NOT NULL DEFAULT 'operator' CHECK (position IN ('operator', 'manager', 'technician', 'security')),
        shift        VARCHAR(50) NOT NULL DEFAULT 'morning' CHECK (shift IN ('morning', 'afternoon', 'night')),
        hire_date    DATE NOT NULL DEFAULT CURRENT_DATE,
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_staff_profiles_station_id ON staff_profiles (station_id)`);

    // ─── Attendance ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        staff_id   UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
        work_date  DATE NOT NULL,
        check_in   TIMESTAMPTZ,
        check_out  TIMESTAMPTZ,
        status     VARCHAR(50) NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'late', 'absent', 'leave')),
        notes      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_attendance_staff_date ON attendance (staff_id, work_date)`);

    // ─── Subscriptions ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users_cache(user_id) ON DELETE CASCADE,
        plan_id    UUID NOT NULL,
        plan_name  VARCHAR(100),
        plan_type  VARCHAR(20),
        start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        end_date   TIMESTAMPTZ,
        auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
        status     VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_subscriptions_user_status ON subscriptions (user_id, status)`);

    // ─── Processed Events ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id     VARCHAR(100) PRIMARY KEY,
        event_type   VARCHAR(100) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Event Outbox ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS event_outbox (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        aggregate_type VARCHAR(100) NOT NULL,
        aggregate_id   UUID NOT NULL,
        event_type     VARCHAR(100) NOT NULL,
        payload        JSONB NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','processed','failed')),
        retry_count    SMALLINT NOT NULL DEFAULT 0,
        error_message  TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at   TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_outbox_pending ON event_outbox (status, created_at) WHERE status = 'pending'`);

    // ─── Seed Data ───
    // User cache
    await queryRunner.query(`
      INSERT INTO users_cache (user_id, email, full_name, phone, role_name, status, email_verified) VALUES
      ('22222222-2222-2222-2222-222222222222', 'admin@ev-platform.com', 'Admin User', '0900000000', 'admin', 'active', TRUE),
      ('33333333-3333-3333-3333-333333333333', 'nguyen.van.an@gmail.com', 'Nguyễn Văn An', '0901234567', 'user', 'active', TRUE),
      ('44444444-4444-4444-4444-444444444444', 'tran.thi.bich@gmail.com', 'Trần Thị Bích', '0912345678', 'user', 'active', TRUE)
      ON CONFLICT DO NOTHING
    `);

    // Vehicle Models
    await queryRunner.query(`
      INSERT INTO vehicle_models (id, brand, model_name, year, battery_capacity_kwh, default_charge_port, max_dc_power_kw) VALUES
      ('88888888-8888-8888-8888-888888888888', 'VinFast', 'VF8', 2023, 87.7, 'CCS', 150),
      ('99999999-9999-9999-9999-999999999999', 'Tesla', 'Model 3', 2022, 79, 'Other', 250)
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS event_outbox CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS processed_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS subscriptions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendance CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS staff_profiles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_models CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_fcm_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_profiles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users_cache CASCADE`);
  }
}
