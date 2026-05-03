import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration V2: Thêm charger_state table và cập nhật session status enum.
 * Chỉ các thay đổi incremental — InitialSchema đã tồn tại.
 */
export class AddChargerState1712450000000 implements MigrationInterface {
  name = 'AddChargerState1712450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── charger_state: 1 row per charger (upsert pattern) ───────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charger_state (
        charger_id        UUID PRIMARY KEY,
        availability      VARCHAR(20) NOT NULL DEFAULT 'available'
                          CHECK (availability IN ('available','occupied','faulted','offline','reserved')),
        active_session_id UUID REFERENCES charging_sessions(id) ON DELETE SET NULL,
        error_code        VARCHAR(100),
        last_heartbeat_at TIMESTAMPTZ,
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_charger_state_avail ON charger_state (availability)
      WHERE availability = 'available'
    `);

    // ─── Thêm voltage/current vào session_telemetry nếu chưa có ─────────────
    await queryRunner.query(`
      ALTER TABLE session_telemetry
        ADD COLUMN IF NOT EXISTS voltage_v  DECIMAL(7,2),
        ADD COLUMN IF NOT EXISTS current_a  DECIMAL(7,3)
    `);

    // ─── Add partial index for active sessions per charger ───────────────────
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_session_charger_active
        ON charging_sessions (charger_id)
        WHERE status = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_session_charger_active`);
    await queryRunner.query(`ALTER TABLE session_telemetry DROP COLUMN IF EXISTS voltage_v`);
    await queryRunner.query(`ALTER TABLE session_telemetry DROP COLUMN IF EXISTS current_a`);
    await queryRunner.query(`DROP TABLE IF EXISTS charger_state CASCADE`);
  }
}
