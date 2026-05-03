CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE platform_kpi_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    captured_at TIMESTAMPTZ NOT NULL,
    period VARCHAR(20) NOT NULL,
    active_sessions INTEGER NOT NULL DEFAULT 0,
    total_chargers INTEGER NOT NULL DEFAULT 0,
    available_chargers INTEGER NOT NULL DEFAULT 0,
    bookings_last_hour INTEGER NOT NULL DEFAULT 0,
    revenue_last_hour_vnd BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_kpi_captured ON platform_kpi_snapshots (captured_at);

CREATE TABLE daily_station_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL,
    metric_date DATE NOT NULL,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    total_kwh NUMERIC(12, 4) NOT NULL DEFAULT 0,
    total_revenue_vnd BIGINT NOT NULL DEFAULT 0,
    avg_session_min NUMERIC(8, 2) NOT NULL DEFAULT 0,
    utilization_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dsm_date ON daily_station_metrics (metric_date);
CREATE INDEX idx_dsm_station_date ON daily_station_metrics (station_id, metric_date);

CREATE TABLE daily_user_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    metric_date DATE NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 0,
    kwh_consumed NUMERIC(10, 4) NOT NULL DEFAULT 0,
    amount_spent_vnd BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_dum_user_date ON daily_user_metrics (user_id, metric_date);

CREATE TABLE hourly_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL,
    charger_id UUID NOT NULL,
    hour_bucket TIMESTAMPTZ NOT NULL,
    hour_of_day SMALLINT NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 0,
    kwh_consumed NUMERIC(10, 4) NOT NULL DEFAULT 0,
    total_duration_min NUMERIC(10, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hus_hour_of_day ON hourly_usage_stats (hour_of_day, hour_bucket);
CREATE INDEX idx_hus_station_bucket ON hourly_usage_stats (station_id, hour_bucket);

CREATE TABLE revenue_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID,
    billing_month VARCHAR(7) NOT NULL,
    total_revenue_vnd BIGINT NOT NULL DEFAULT 0,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rev_month ON revenue_stats (billing_month);
CREATE INDEX idx_rev_station_month ON revenue_stats (station_id, billing_month);

CREATE TABLE booking_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL,
    metric_date DATE NOT NULL,
    bookings_created INTEGER NOT NULL DEFAULT 0,
    bookings_confirmed INTEGER NOT NULL DEFAULT 0,
    bookings_cancelled INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bks_station_date ON booking_stats (station_id, metric_date);

CREATE TABLE user_behavior_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    total_kwh NUMERIC(12, 4) NOT NULL DEFAULT 0,
    total_duration_min NUMERIC(10, 2) NOT NULL DEFAULT 0,
    avg_duration_min NUMERIC(8, 2) NOT NULL DEFAULT 0,
    last_session_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ubs_user ON user_behavior_stats (user_id);

CREATE TABLE event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    source_service VARCHAR(50) NOT NULL,
    aggregate_id UUID,
    user_id UUID,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_elog_type_time ON event_log (event_type, received_at);
CREATE INDEX idx_elog_user_time ON event_log (user_id, received_at);

CREATE TABLE processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
