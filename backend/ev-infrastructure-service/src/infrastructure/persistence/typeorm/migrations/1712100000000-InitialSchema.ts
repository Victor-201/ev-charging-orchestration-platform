import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712100000000 implements MigrationInterface {
  name = 'InitialSchema1712100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    // ─── Stations (BCNF) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stations (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(200) NOT NULL,
        operator_id   UUID NOT NULL,
        address_line  VARCHAR(300) NOT NULL,
        city          VARCHAR(100) NOT NULL,
        country       VARCHAR(10)  NOT NULL DEFAULT 'VN',
        latitude      DECIMAL(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
        longitude     DECIMAL(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
        status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','maintenance','coming_soon')),
        rating        DECIMAL(3,2) DEFAULT 0.00,
        total_reviews INT NOT NULL DEFAULT 0,
        amenities     JSONB NOT NULL DEFAULT '[]',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_stations_city ON stations (city)`);
    await queryRunner.query(`CREATE INDEX idx_stations_status ON stations (status) WHERE status = 'active'`);
    await queryRunner.query(`CREATE INDEX idx_stations_geo ON stations (latitude, longitude)`);
    await queryRunner.query(`CREATE INDEX idx_stations_operator ON stations (operator_id)`);

    // ─── Charging points — normalized (no station data duplicated) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charging_points (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id        UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
        point_name        VARCHAR(50) NOT NULL,
        connector_type    VARCHAR(20) NOT NULL
                          CHECK (connector_type IN ('Type1','Type2','CCS1','CCS2','CHAdeMO','Tesla','Mennekes')),
        max_power_kw      DECIMAL(8,2) NOT NULL CHECK (max_power_kw > 0),
        price_per_kwh     DECIMAL(8,4) NOT NULL DEFAULT 3500,
        price_per_minute  DECIMAL(8,4) NOT NULL DEFAULT 0,
        status            VARCHAR(20)  NOT NULL DEFAULT 'available'
                          CHECK (status IN ('available','in_use','offline','reserved','faulted','maintenance')),
        floor_level       SMALLINT DEFAULT 0,
        is_accessible     BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_cp_station ON charging_points (station_id)`);
    await queryRunner.query(`CREATE INDEX idx_cp_status ON charging_points (status, connector_type) WHERE status = 'available'`);
    await queryRunner.query(`CREATE INDEX idx_cp_station_status ON charging_points (station_id, status)`);

    // ─── Maintenance schedules ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id      UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
        point_id        UUID REFERENCES charging_points(id) ON DELETE SET NULL,
        scheduled_at    TIMESTAMPTZ NOT NULL,
        duration_min    INT NOT NULL DEFAULT 60,
        reason          VARCHAR(500),
        technician_name VARCHAR(100),
        status          VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_maintenance_station ON maintenance_schedules (station_id, scheduled_at)`);

    // ─── Charger status history ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charger_status_history (
        id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        point_id  UUID NOT NULL REFERENCES charging_points(id) ON DELETE CASCADE,
        status    VARCHAR(20) NOT NULL,
        reason    VARCHAR(200),
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_csh_point ON charger_status_history (point_id, changed_at DESC)`);

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

    // ─── Seed: Stations in major Vietnamese cities ───
    await queryRunner.query(`
      INSERT INTO stations (id, name, operator_id, address_line, city, latitude, longitude, amenities) VALUES
      ('b0000000-0000-0000-0000-000000000001','Vinfast Station Hanoi Center','a0000000-0000-0000-0000-000000000006','12 Tràng Tiền, Hoàn Kiếm','Hanoi',21.028511,105.852799,'["wifi","parking","restroom","cafe"]'),
      ('b0000000-0000-0000-0000-000000000002','EV Charge Hub HCMC Q1','a0000000-0000-0000-0000-000000000006','58 Đồng Khởi, Quận 1','Ho Chi Minh City',10.779236,106.699236,'["wifi","parking","restaurant"]'),
      ('b0000000-0000-0000-0000-000000000003','Green Power Da Nang Beach','a0000000-0000-0000-0000-000000000006','25 Võ Nguyên Giáp, Ngũ Hành Sơn','Da Nang',16.039694,108.241539,'["wifi","parking"]'),
      ('b0000000-0000-0000-0000-000000000004','VinMec Station Hai Phong','a0000000-0000-0000-0000-000000000006','15 Lê Thánh Tông, Ngô Quyền','Hai Phong',20.858864,106.684338,'["parking","restroom"]'),
      ('b0000000-0000-0000-0000-000000000005','SmartCharge Can Tho','a0000000-0000-0000-0000-000000000006','01 Hòa Bình, Ninh Kiều','Can Tho',10.046889,105.782539,'["wifi","parking"]')
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO charging_points (id, station_id, point_name, connector_type, max_power_kw, price_per_kwh, price_per_minute, status) VALUES
      -- Hanoi station
      ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','CP-01','CCS2',150,4200,0,'available'),
      ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001','CP-02','CCS2',150,4200,0,'available'),
      ('c0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','CP-03','Type2',22,3800,200,'available'),
      ('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000001','CP-04','CHAdeMO',50,4000,0,'in_use'),
      -- HCMC station
      ('c0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000002','CP-01','CCS2',150,4500,0,'available'),
      ('c0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000002','CP-02','CCS2',150,4500,0,'available'),
      ('c0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000002','CP-03','Tesla',120,4300,0,'available'),
      -- Da Nang station
      ('c0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000003','CP-01','Type2',22,3600,150,'available'),
      ('c0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000003','CP-02','CCS2',100,4100,0,'available'),
      -- Hai Phong station
      ('c0000000-0000-0000-0000-000000000010','b0000000-0000-0000-0000-000000000004','CP-01','CCS2',150,4000,0,'available'),
      -- Can Tho station
      ('c0000000-0000-0000-0000-000000000011','b0000000-0000-0000-0000-000000000005','CP-01','Type2',22,3500,100,'available'),
      ('c0000000-0000-0000-0000-000000000012','b0000000-0000-0000-0000-000000000005','CP-02','CHAdeMO',50,3800,0,'available')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS event_outbox CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS charger_status_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS maintenance_schedules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS charging_points CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS stations CASCADE`);
  }
}
