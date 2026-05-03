import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable btree_gist for EXCLUDE USING GIST
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // Chargers table (synced from station-service via events)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chargers (
        id            UUID PRIMARY KEY,
        station_id    UUID NOT NULL,
        connector_type VARCHAR(30) NOT NULL,
        max_power_kw  DECIMAL(8,2),
        status        VARCHAR(20) NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available','in_use','offline','reserved','faulted')),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_chargers_station
        ON chargers (station_id)
    `);

    // Bookings table with EXCLUDE constraint (DB-level no-overlap guarantee)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id            UUID PRIMARY KEY,
        user_id       UUID NOT NULL,
        charger_id    UUID NOT NULL REFERENCES chargers(id),
        start_time    TIMESTAMPTZ NOT NULL,
        end_time      TIMESTAMPTZ NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','completed','cancelled')),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT no_double_booking EXCLUDE USING gist (
          charger_id WITH =,
          tstzrange(start_time, end_time, '[)') WITH &&
        ) WHERE (status IN ('pending','confirmed'))
      )
    `);

    // Critical performance index — every overlap check hits this
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_booking_time
        ON bookings (charger_id, start_time, end_time)
        WHERE status IN ('pending','confirmed')
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_booking_user
        ON bookings (user_id, status)
    `);

    // Queue table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_queue (
        id              UUID PRIMARY KEY,
        user_id         UUID NOT NULL,
        charger_id      UUID NOT NULL,
        connector_type  VARCHAR(30) NOT NULL,
        requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_priority   SMALLINT NOT NULL DEFAULT 1 CHECK (user_priority BETWEEN 1 AND 10),
        urgency_score   SMALLINT NOT NULL DEFAULT 0 CHECK (urgency_score BETWEEN 0 AND 10),
        status          VARCHAR(20) NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting','assigned','cancelled')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_user_charger_waiting UNIQUE (user_id, charger_id, status)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_charger_status
        ON booking_queue (charger_id, status, requested_at)
        WHERE status = 'waiting'
    `);

    // Outbox table
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_outbox_pending
        ON event_outbox (status, created_at)
        WHERE status = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS event_outbox`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_queue`);
    await queryRunner.query(`DROP TABLE IF EXISTS bookings`);
    await queryRunner.query(`DROP TABLE IF EXISTS chargers`);
  }
}
