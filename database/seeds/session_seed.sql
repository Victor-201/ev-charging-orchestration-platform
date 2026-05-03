-- ==============================================================================
-- SESSION SERVICE SEED DATA
-- Purpose: Realistic demo data for charging sessions, bookings, and telemetry
-- ==============================================================================

-- 1. Read Models Initial Data
-- Từ ev_infra_db:
-- b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11 (Trạm Landmark 81)
-- d1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11 (Trụ DC 250kW Landmark 81)
-- b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12 (Trạm Times City)
-- d1eebc99-9c0b-4ef8-bb6d-6bb9bd380d12 (Trụ DC 250kW Times City)
INSERT INTO charger_read_models (
    charger_id, station_id, station_name, city_name, connector_type, max_power_kw
) VALUES 
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Trạm sạc Vincom Center Landmark 81', 'Hồ Chí Minh', 'CCS', 250.00),
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380d12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'Trạm sạc Vincom Mega Mall Times City', 'Hà Nội', 'CCS', 250.00)
ON CONFLICT (charger_id) DO NOTHING;

-- Từ iam_db:
INSERT INTO user_debt_read_models (user_id, has_outstanding_debt, arrears_amount)
VALUES 
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', false, 0),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', false, 0)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Charger State
INSERT INTO charger_state (
    charger_id, availability, active_session_id, last_heartbeat_at
) VALUES 
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'occupied', 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', '2026-05-01 15:45:00+07'),
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380d12', 'available', NULL, '2026-05-01 15:45:00+07')
ON CONFLICT (charger_id) DO NOTHING;

-- 3. Bookings
-- Booking 1: Lê Thảo Linh đặt tại Landmark 81 (đã completed do sạc xong)
-- Booking 2: Phạm Quốc Tuấn đặt tại Times City (confirmed, chưa sạc)
INSERT INTO bookings (
    id, user_id, charger_id, start_time, end_time, status, deposit_amount, connector_type, idempotency_key
) VALUES 
    (
        'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11',
        '2026-04-30 14:00:00+07', '2026-04-30 15:30:00+07', 'completed', 50000, 'CCS', 'idem-book-1'
    ),
    (
        'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380e12', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d12',
        '2026-05-01 14:00:00+07', '2026-05-01 15:00:00+07', 'confirmed', 50000, 'CCS', 'idem-book-2'
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Charging Sessions
-- Session 1: Lê Thảo Linh đã sạc xong (Billed)
-- Session 2: Phạm Quốc Tuấn đang sạc (Active)
INSERT INTO charging_sessions (
    id, booking_id, user_id, charger_id, start_time, end_time, start_meter_wh, end_meter_wh, 
    status, energy_fee_vnd, deposit_amount, stopped_at, billed_at, idempotency_key
) VALUES 
    (
        'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380f21', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11',
        '2026-04-30 14:45:00+07', '2026-04-30 15:30:00+07', 100000, 135500, 
        'billed', 124250, 50000, '2026-04-30 15:30:00+07', '2026-04-30 15:30:05+07', 'idem-sess-1'
    ),
    (
        'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', NULL, 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11',
        '2026-05-01 15:00:00+07', NULL, 150000, NULL, 
        'active', 0, 50000, NULL, NULL, 'idem-sess-2'
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Session Telemetry (Giả lập đồ thị dòng sạc cho Session đang active)
INSERT INTO session_telemetry (
    id, session_id, recorded_at, power_kw, meter_wh, voltage_v, current_a, soc_percent, temperature_c
) VALUES 
    (uuid_generate_v4(), 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', '2026-05-01 15:05:00+07', 45.5, 153500, 395.2, 115.1, 25, 32.5),
    (uuid_generate_v4(), 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', '2026-05-01 15:10:00+07', 85.2, 160600, 402.1, 211.8, 35, 35.0),
    (uuid_generate_v4(), 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', '2026-05-01 15:15:00+07', 120.5, 170600, 410.5, 293.5, 48, 38.2),
    (uuid_generate_v4(), 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', '2026-05-01 15:20:00+07', 150.0, 183100, 415.0, 361.4, 62, 42.1),
    (uuid_generate_v4(), 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', '2026-05-01 15:25:00+07', 95.5, 191000, 418.2, 228.3, 75, 40.5)
ON CONFLICT DO NOTHING;
