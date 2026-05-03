-- ==============================================================================
-- ANALYTICS SERVICE SEED DATA
-- Purpose: Realistic demo data for analytics and reporting
-- ==============================================================================

-- 1. KPI Snapshots
INSERT INTO platform_kpi_snapshots (
    id, captured_at, period, active_sessions, total_chargers, available_chargers, bookings_last_hour, revenue_last_hour_vnd
) VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2026-05-01 08:00:00+07', '2026-05', 45, 120, 70, 15, 2500000),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', '2026-05-01 09:00:00+07', '2026-05', 68, 120, 48, 22, 3800000),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', '2026-05-01 10:00:00+07', '2026-05', 85, 120, 30, 28, 4900000)
ON CONFLICT (id) DO NOTHING;

-- 2. Daily Station Metrics
-- VinFast Landmark 81: b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11
-- VinFast Times City: b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12
INSERT INTO daily_station_metrics (
    id, station_id, metric_date, total_sessions, total_kwh, total_revenue_vnd, avg_session_min, utilization_rate
) VALUES 
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', '2026-04-29', 142, 4260.5000, 14911750, 45.5, 0.6500),
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', '2026-04-30', 185, 5550.0000, 19425000, 42.0, 0.8200),
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', '2026-04-29', 95, 2850.2500, 9975875, 38.5, 0.4500),
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', '2026-04-30', 110, 3300.0000, 11550000, 40.0, 0.5200);

-- 3. Daily User Metrics
-- Lê Thảo Linh: c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21
-- Phạm Quốc Tuấn: c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22
INSERT INTO daily_user_metrics (
    id, user_id, metric_date, sessions_count, kwh_consumed, amount_spent_vnd
) VALUES 
    (uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', '2026-04-29', 1, 35.5000, 124250),
    (uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', '2026-04-30', 2, 42.0000, 147000),
    (uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', '2026-04-30', 1, 55.2500, 193375);

-- 4. Hourly Usage Stats
INSERT INTO hourly_usage_stats (
    id, station_id, charger_id, hour_bucket, hour_of_day, sessions_count, kwh_consumed, total_duration_min
) VALUES 
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', '2026-05-01 08:00:00+07', 8, 3, 95.5000, 135.00),
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', '2026-05-01 09:00:00+07', 9, 4, 120.0000, 180.00),
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d12', '2026-05-01 08:00:00+07', 8, 2, 60.2500, 90.00);

-- 5. Revenue Stats
INSERT INTO revenue_stats (
    id, station_id, billing_month, total_revenue_vnd, total_transactions
) VALUES 
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', '2026-04', 458500000, 3250),
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', '2026-04', 285400000, 1980),
    (uuid_generate_v4(), NULL, '2026-04', 743900000, 5230); -- Platform total

-- 6. Booking Stats
INSERT INTO booking_stats (
    id, station_id, metric_date, bookings_created, bookings_confirmed, bookings_cancelled
) VALUES 
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', '2026-04-29', 150, 135, 15),
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', '2026-04-30', 200, 185, 15),
    (uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', '2026-04-30', 120, 105, 15);

-- 7. User Behavior Stats
INSERT INTO user_behavior_stats (
    id, user_id, total_sessions, total_kwh, total_duration_min, avg_duration_min, last_session_at
) VALUES 
    (uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 45, 1520.5000, 1850.00, 41.11, '2026-04-30 15:30:00+07'),
    (uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 28, 985.2500, 1120.00, 40.00, '2026-04-30 10:15:00+07')
ON CONFLICT (user_id) DO NOTHING;

-- 8. Event Log (Sample)
INSERT INTO event_log (
    id, event_type, source_service, aggregate_id, user_id, payload, received_at
) VALUES 
    (uuid_generate_v4(), 'session.completed_v1', 'session-service', 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380f21', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', '{"kwh": 35.5, "duration": 45}', '2026-04-30 15:30:00+07'),
    (uuid_generate_v4(), 'payment.success_v1', 'billing-service', 'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e22', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', '{"amount": 124250}', '2026-04-30 15:30:05+07');
