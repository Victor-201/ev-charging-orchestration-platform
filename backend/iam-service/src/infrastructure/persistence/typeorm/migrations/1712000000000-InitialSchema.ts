import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712000000000 implements MigrationInterface {
  name = 'InitialSchema1712000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Users ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(255) NOT NULL UNIQUE,
        full_name     VARCHAR(100) NOT NULL,
        phone         VARCHAR(20),
        date_of_birth DATE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status        VARCHAR(30)  NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','suspended','pending_verification')),
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_users_email ON users (email)`);
    await queryRunner.query(`CREATE INDEX idx_users_status ON users (status)`);

    // ─── Roles ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        is_system   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Permissions ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL UNIQUE,
        resource    VARCHAR(50) NOT NULL,
        action      VARCHAR(50) NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Role Permissions ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    // ─── User Roles ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        assigned_by UUID,
        expires_at  TIMESTAMPTZ,
        PRIMARY KEY (user_id, role_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_user_roles_user_id ON user_roles (user_id)`);

    // ─── Auth Sessions ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash  VARCHAR(255) NOT NULL UNIQUE,
        device_fingerprint  VARCHAR(255),
        ip_address          INET,
        user_agent          TEXT,
        expires_at          TIMESTAMPTZ NOT NULL,
        revoked_at          TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_auth_sessions_refresh_token_hash ON auth_sessions (refresh_token_hash)`);

    // ─── Email Verification Tokens ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        verified_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_email_tokens_hash ON email_verification_tokens (token_hash)`);

    // ─── Password Reset Tokens ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_password_tokens_hash ON password_reset_tokens (token_hash)`);

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
    await queryRunner.query(`CREATE INDEX idx_outbox_aggregate ON event_outbox (aggregate_type, aggregate_id)`);

    // ─── Seed data: Admin Role & User ───
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, is_system)
      VALUES ('11111111-1111-1111-1111-111111111111', 'admin', 'System Administrator', TRUE)
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO users (id, email, full_name, date_of_birth, password_hash, status, email_verified)
      VALUES (
        '22222222-2222-2222-2222-222222222222',
        'admin@ev-platform.com',
        'Admin User',
        '1990-01-01',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCO4HnZbR5MgFX4m7ZrQstPVE4oqf1a6fO',
        'active', TRUE
      ) ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS event_outbox CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_verification_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_sessions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
  }
}
