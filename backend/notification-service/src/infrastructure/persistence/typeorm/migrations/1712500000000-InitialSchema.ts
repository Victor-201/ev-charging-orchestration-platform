import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712500000000 implements MigrationInterface {
  name = 'InitialSchema1712500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Notification templates (normalized: no template data in notifications) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type             VARCHAR(50) NOT NULL UNIQUE,
        channel          VARCHAR(20) NOT NULL CHECK (channel IN ('email','push','in_app','sms')),
        subject_template VARCHAR(500),
        body_template    TEXT NOT NULL,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Notifications (normalized: type references template, no template content duplicated) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL,
        type        VARCHAR(50) NOT NULL,
        channel     VARCHAR(20) NOT NULL,
        title       VARCHAR(500) NOT NULL,
        body        TEXT NOT NULL,
        status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','delivered','failed','read')),
        metadata    JSONB NOT NULL DEFAULT '{}',
        read_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_notif_user ON notifications (user_id, status, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_notif_pending ON notifications (status, created_at) WHERE status = 'pending'`);
    await queryRunner.query(`CREATE INDEX idx_notif_unread ON notifications (user_id, read_at) WHERE read_at IS NULL`);

    // ─── Idempotent events ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id     VARCHAR(255) PRIMARY KEY,
        event_type   VARCHAR(100) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Seed templates ───
    await queryRunner.query(`
      INSERT INTO notification_templates (type, channel, subject_template, body_template) VALUES
      ('booking.created','in_app',NULL,'Đặt lịch sạc #{{bookingId}} của bạn đã được tạo thành công.'),
      ('booking.confirmed','push','Lịch sạc được xác nhận','Lịch sạc của bạn tại {{stationName}} đã được xác nhận lúc {{startTime}}.'),
      ('booking.cancelled','in_app',NULL,'Lịch sạc #{{bookingId}} đã bị hủy. Lý do: {{reason}}.'),
      ('booking.completed','push','Sạc hoàn tất','Bạn vừa hoàn thành {{kwhConsumed}} kWh. Hóa đơn: {{totalAmount}} VND.'),
      ('session.started','push','Bắt đầu sạc','Phiên sạc đã bắt đầu. Công suất hiện tại: {{powerKw}} kW.'),
      ('session.completed','email','Hóa đơn sạc điện','Cảm ơn bạn đã sạc tại {{stationName}}. Tổng: {{totalAmount}} VND.'),
      ('payment.completed','push','Thanh toán thành công','Thanh toán {{amount}} VND cho hóa đơn #{{invoiceId}} thành công.'),
      ('payment.failed','push','Thanh toán thất bại','Thanh toán {{amount}} VND thất bại. Vui lòng thử lại.')
      ON CONFLICT (type) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS processed_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_templates CASCADE`);
  }
}
