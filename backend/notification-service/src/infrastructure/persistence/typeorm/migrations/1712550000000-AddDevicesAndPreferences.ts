import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration V2: notification-service
 *
 * Thêm:
 * - devices table (FCM token management, multi-device)
 * - notification_preferences table (per-user channel config)
 * - missing indexes
 */
export class AddDevicesAndPreferences1712550000000 implements MigrationInterface {
  name = 'AddDevicesAndPreferences1712550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── devices ───────────────────────────────────────────────────────────────
    // BCNF: id → {user_id, platform, push_token, device_name, last_active_at}
    // push_token UNIQUE: FCM token globally unique per device
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        UUID         NOT NULL,
        platform       VARCHAR(20)  NOT NULL CHECK (platform IN ('ios','android','web')),
        push_token     VARCHAR(512) NOT NULL UNIQUE,
        device_name    VARCHAR(255),
        last_active_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_dev_user  ON devices (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_dev_token ON devices (push_token)`);
    await queryRunner.query(`CREATE INDEX idx_dev_active ON devices (user_id, last_active_at DESC)`);

    // ── notification_preferences ──────────────────────────────────────────────
    // BCNF: user_id (PK) → {enable_push, enable_realtime, enable_email, quiet_hours}
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id           UUID      PRIMARY KEY,
        enable_push       BOOLEAN   NOT NULL DEFAULT TRUE,
        enable_realtime   BOOLEAN   NOT NULL DEFAULT TRUE,
        enable_email      BOOLEAN   NOT NULL DEFAULT TRUE,
        enable_sms        BOOLEAN   NOT NULL DEFAULT FALSE,
        quiet_hours_start SMALLINT  CHECK (quiet_hours_start BETWEEN 0 AND 23),
        quiet_hours_end   SMALLINT  CHECK (quiet_hours_end BETWEEN 0 AND 23),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Extra indexes for notifications ───────────────────────────────────────
    // Unread count query pattern: WHERE user_id = ? AND read_at IS NULL
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_unread_fast
        ON notifications (user_id, created_at DESC)
        WHERE read_at IS NULL
    `);

    // ── Default preferences for seeded users ──────────────────────────────────
    await queryRunner.query(`
      INSERT INTO notification_preferences (user_id, enable_push, enable_realtime, enable_email)
      VALUES
        ('a0000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE),
        ('a0000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE),
        ('a0000000-0000-0000-0000-000000000003', TRUE, FALSE, TRUE),
        ('a0000000-0000-0000-0000-000000000004', FALSE, TRUE, FALSE)
      ON CONFLICT (user_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notif_unread_fast`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_preferences CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS devices CASCADE`);
  }
}
