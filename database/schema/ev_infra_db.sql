CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE charging_points_status_enum AS ENUM ('available', 'in_use', 'offline', 'faulted', 'reserved');
CREATE TYPE connectors_connector_type_enum AS ENUM ('CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Other');
CREATE TYPE event_outbox_status_enum AS ENUM ('pending', 'processed', 'failed');
CREATE TYPE pricing_rules_connector_type_enum AS ENUM ('CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Other');
CREATE TYPE station_incidents_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE station_incidents_status_enum AS ENUM ('pending_confirmation', 'in_progress', 'resolved', 'rejected');
CREATE TYPE stations_status_enum AS ENUM ('active', 'closed', 'maintenance', 'inactive');

CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_name VARCHAR(100) NOT NULL UNIQUE,
    region VARCHAR(100) NOT NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'VN'
);

CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    city_id UUID NOT NULL REFERENCES cities(id),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    status stations_status_enum NOT NULL DEFAULT 'active',
    owner_id UUID,
    owner_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sta_city ON stations (city_id);
CREATE INDEX idx_sta_geo ON stations (latitude, longitude);
CREATE INDEX idx_sta_status ON stations (status);

CREATE TABLE charging_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    external_id VARCHAR(100) UNIQUE,
    max_power_kw NUMERIC(8, 2),
    status charging_points_status_enum NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_station ON charging_points (station_id);
CREATE INDEX idx_cp_status ON charging_points (status);

CREATE TABLE connectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charging_point_id UUID NOT NULL REFERENCES charging_points(id) ON DELETE CASCADE,
    connector_type connectors_connector_type_enum NOT NULL,
    max_power_kw NUMERIC(8, 2)
);

CREATE INDEX idx_conn_cp ON connectors (charging_point_id);

CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    connector_type pricing_rules_connector_type_enum NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    hour_start SMALLINT,
    hour_end SMALLINT,
    day_mask SMALLINT NOT NULL DEFAULT 0,
    price_per_kwh NUMERIC(10, 4) NOT NULL,
    price_per_minute NUMERIC(10, 4),
    idle_grace_minutes SMALLINT NOT NULL DEFAULT 20,
    idle_fee_per_minute NUMERIC(10, 2) NOT NULL DEFAULT 1000,
    label VARCHAR(100),
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_lookup ON pricing_rules (station_id, connector_type, valid_from);

CREATE TABLE station_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    point_id UUID,
    reported_by UUID,
    description TEXT,
    severity station_incidents_severity_enum NOT NULL DEFAULT 'medium',
    status station_incidents_status_enum NOT NULL DEFAULT 'pending_confirmation',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inc_station ON station_incidents (station_id, status);

CREATE TABLE station_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    scheduled_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maint_station ON station_maintenance (station_id, start_time);
CREATE INDEX idx_maint_time ON station_maintenance (start_time, end_time);

CREATE TABLE event_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status event_outbox_status_enum NOT NULL DEFAULT 'pending',
    retry_count SMALLINT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON event_outbox (status, created_at) WHERE status = 'pending';

CREATE TABLE processed_events (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
