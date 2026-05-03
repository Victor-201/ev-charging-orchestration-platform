import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

/**
 * ClickHouseTelemetryService
 *
 * Ghi dữ liệu telemetry (V/A/kW) vào ClickHouse thay vì PostgreSQL.
 * ClickHouse tối ưu cho Time-Series data với khả năng insert hàng triệu
 * records/giây mà không làm sập hệ thống.
 *
 * Bảng: telemetry_logs (partition by toYYYYMMDD(recorded_at))
 *
 * Fallback: Nếu ClickHouse không available, ghi log và tiếp tục
 * (không được block luồng chính ghi RabbitMQ).
 */
@Injectable()
export class ClickHouseTelemetryService implements OnModuleInit {
  private readonly logger = new Logger(ClickHouseTelemetryService.name);
  private client: ClickHouseClient | null = null;
  private readonly BATCH_BUFFER: TelemetryRow[] = [];
  private readonly MAX_BATCH = 100;
  private readonly FLUSH_INTERVAL_MS = 5_000; // flush mỗi 5 giây
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url      = this.config.get('CLICKHOUSE_URL', 'http://localhost:8123');
    const database = this.config.get('CLICKHOUSE_DATABASE', 'ev_telemetry');
    const username = this.config.get('CLICKHOUSE_USER', 'default');
    const password = this.config.get('CLICKHOUSE_PASSWORD', '');

    try {
      this.client = createClient({ url, database, username, password });

      // Kiểm tra kết nối
      await this.client.ping();
      this.logger.log(`ClickHouse connected: ${url} database=${database}`);

      // Tạo bảng nếu chưa có
      await this.ensureTable();

      // Bắt đầu timer flush định kỳ
      this.flushTimer = setInterval(() => this.flushBatch(), this.FLUSH_INTERVAL_MS);
    } catch (err: any) {
      this.logger.warn(
        `ClickHouse not available (${err.message}). Telemetry will only be published to RabbitMQ.`,
      );
      this.client = null;
    }
  }

  private async ensureTable(): Promise<void> {
    if (!this.client) return;

    await this.client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS telemetry_logs (
          event_id           String,
          charger_id         String,
          session_id         String,
          power_kw           Nullable(Float32),
          current_a          Nullable(Float32),
          voltage_v          Nullable(Float32),
          meter_wh           Nullable(Float64),
          soc_percent        Nullable(Float32),
          temperature_c      Nullable(Float32),
          error_code         Nullable(String),
          hardware_timestamp DateTime64(3, 'Asia/Ho_Chi_Minh'),
          received_at        DateTime64(3, 'Asia/Ho_Chi_Minh') DEFAULT now64()
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(hardware_timestamp)
        ORDER BY (charger_id, hardware_timestamp)
        TTL hardware_timestamp + INTERVAL 90 DAY
        SETTINGS index_granularity = 8192;
      `,
    });

    this.logger.log('ClickHouse table telemetry_logs ensured');
  }

  /**
   * Thêm một bản ghi vào buffer.
   * Khi buffer đầy (100 records) → flush ngay lập tức.
   */
  async ingest(row: TelemetryRow): Promise<void> {
    if (!this.client) return; // ClickHouse không available

    this.BATCH_BUFFER.push(row);

    if (this.BATCH_BUFFER.length >= this.MAX_BATCH) {
      await this.flushBatch();
    }
  }

  /** Flush toàn bộ buffer vào ClickHouse (batch insert) */
  async flushBatch(): Promise<void> {
    if (!this.client || this.BATCH_BUFFER.length === 0) return;

    const batch = this.BATCH_BUFFER.splice(0, this.BATCH_BUFFER.length);

    try {
      await this.client.insert({
        table:  'telemetry_logs',
        values: batch.map((r) => ({
          event_id:           r.eventId,
          charger_id:         r.chargerId,
          session_id:         r.sessionId,
          power_kw:           r.powerKw    ?? null,
          current_a:          r.currentA   ?? null,
          voltage_v:          r.voltageV   ?? null,
          meter_wh:           r.meterWh    ?? null,
          soc_percent:        r.socPercent ?? null,
          temperature_c:      r.temperatureC ?? null,
          error_code:         r.errorCode  ?? null,
          hardware_timestamp: r.hardwareTimestamp ?? r.recordedAt,
        })),
        format: 'JSONEachRow',
      });

      this.logger.debug(`ClickHouse batch inserted: ${batch.length} records`);
    } catch (err: any) {
      this.logger.error(`ClickHouse batch insert failed: ${err.message}`);
      // Không re-throw — không được block luồng chính
    }
  }

  /**
   * Query biểu đồ V/A/kW theo session (dành cho Dashboard/Analytics)
   * Trả về các điểm đo cách nhau theo `intervalSeconds`.
   */
  async getSessionTimeSeries(sessionId: string, intervalSeconds = 30): Promise<TimeSeriesPoint[]> {
    if (!this.client) return [];

    try {
      const result = await this.client.query({
        query: `
          SELECT
            toUnixTimestamp64Milli(
              toStartOfInterval(hardware_timestamp, INTERVAL {interval:UInt32} SECOND)
            )                                        AS ts,
            avg(power_kw)                            AS avg_power_kw,
            avg(current_a)                           AS avg_current_a,
            avg(voltage_v)                           AS avg_voltage_v,
            max(meter_wh)                            AS max_meter_wh,
            avg(soc_percent)                         AS avg_soc_percent
          FROM telemetry_logs
          WHERE session_id = {session_id:String}
          GROUP BY ts
          ORDER BY ts ASC
        `,
        query_params: {
          session_id: sessionId,
          interval:   intervalSeconds,
        },
        format: 'JSONEachRow',
      });

      return (await result.json()) as TimeSeriesPoint[];
    } catch (err: any) {
      this.logger.error(`ClickHouse query failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Tổng kWh tiêu thụ của một session (dùng để đối soát billing)
   */
  async getSessionEnergyKwh(sessionId: string): Promise<number> {
    if (!this.client) return 0;

    try {
      const result = await this.client.query({
        query: `
          SELECT (max(meter_wh) - min(meter_wh)) / 1000 AS total_kwh
          FROM telemetry_logs
          WHERE session_id = {session_id:String}
        `,
        query_params: { session_id: sessionId },
        format: 'JSONEachRow',
      });
      const rows = (await result.json()) as Array<{ total_kwh: number }>;
      return rows[0]?.total_kwh ?? 0;
    } catch {
      return 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flushBatch();
    await this.client?.close();
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TelemetryRow {
  eventId:            string;
  chargerId:          string;
  sessionId:          string;
  powerKw?:           number | null;
  currentA?:          number | null;
  voltageV?:          number | null;
  meterWh?:           number | null;
  socPercent?:        number | null;
  temperatureC?:      number | null;
  errorCode?:         string | null;
  hardwareTimestamp?: string | null;  // ISO string từ phần cứng (Task 5.1)
  recordedAt:         string;          // ISO string nhận được
}

export interface TimeSeriesPoint {
  ts:            number;   // unix timestamp ms
  avg_power_kw:  number;
  avg_current_a: number;
  avg_voltage_v: number;
  max_meter_wh:  number;
  avg_soc_percent: number;
}
