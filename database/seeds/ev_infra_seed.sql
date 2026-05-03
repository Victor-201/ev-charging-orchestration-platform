-- ==============================================================================
-- EV INFRASTRUCTURE SERVICE SEED DATA
-- Purpose: Realistic demo data for stations, chargers, connectors, and pricing
-- ==============================================================================

-- 1. Cities
INSERT INTO cities (
    id, city_name, region, country_code
) VALUES 
    ('a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Hồ Chí Minh', 'Miền Nam', 'VN'),
    ('a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Hà Nội', 'Miền Bắc', 'VN'),
    ('a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Đà Nẵng', 'Miền Trung', 'VN')
ON CONFLICT (city_name) DO NOTHING;

-- 2. Stations (Trạm sạc thực tế)
-- Landmark 81: b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11 (Trùng khớp UUID với Analytics)
-- Times City: b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12
INSERT INTO stations (
    id, name, address, city_id, latitude, longitude, status, owner_id, owner_name
) VALUES 
    (
        'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 
        'Trạm sạc Vincom Center Landmark 81', 
        'Hầm B2, Vincom Center Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh', 
        'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 
        10.7946, 106.7214, 'active', NULL, 'V-Green'
    ),
    (
        'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 
        'Trạm sạc Vincom Mega Mall Times City', 
        'Hầm B3, Vincom Mega Mall Times City, 458 Minh Khai, Vĩnh Phú, Hai Bà Trưng', 
        'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 
        20.9942, 105.8679, 'active', NULL, 'V-Green'
    )
ON CONFLICT (id) DO NOTHING;

-- 3. Charging Points (Trụ sạc)
-- Landmark 81 - Trụ 1 (11kW AC): c3eebc99-9c0b-4ef8-bb6d-6bb9bd380c31
-- Landmark 81 - Trụ 2 (250kW DC): d1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11 (Trùng với Analytics)
-- Times City - Trụ 1 (250kW DC): d1eebc99-9c0b-4ef8-bb6d-6bb9bd380d12
INSERT INTO charging_points (
    id, station_id, name, external_id, max_power_kw, status
) VALUES 
    (
        'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380c31', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 
        'Trụ AC 11kW - T01', 'LM81-AC-001', 11.00, 'available'
    ),
    (
        'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 
        'Trụ DC Siêu tốc 250kW - T02', 'LM81-DC-002', 250.00, 'in_use'
    ),
    (
        'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 
        'Trụ DC Siêu tốc 250kW - T01', 'TC-DC-001', 250.00, 'available'
    )
ON CONFLICT (external_id) DO NOTHING;

-- 4. Connectors (Súng sạc)
INSERT INTO connectors (
    id, charging_point_id, connector_type, max_power_kw
) VALUES 
    (uuid_generate_v4(), 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380c31', 'Type2', 11.00),
    (uuid_generate_v4(), 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'CCS', 250.00),
    (uuid_generate_v4(), 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d12', 'CCS', 250.00);

-- 5. Pricing Rules (Cấu hình giá điện sạc - Time of Use)
-- VinFast standard price: 3858 VND/kWh
-- Pricing rule 1: Giá chuẩn cho CCS
-- Pricing rule 2: Giá chuẩn cho Type2
INSERT INTO pricing_rules (
    id, station_id, connector_type, valid_from, valid_to, hour_start, hour_end, day_mask, 
    price_per_kwh, price_per_minute, idle_grace_minutes, idle_fee_per_minute, label, currency
) VALUES 
    (
        uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'CCS', 
        '2026-01-01 00:00:00+07', NULL, NULL, NULL, 0, 
        3858.00, 0, 20, 1000.00, 'Giá tiêu chuẩn DC', 'VND'
    ),
    (
        uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Type2', 
        '2026-01-01 00:00:00+07', NULL, NULL, NULL, 0, 
        3858.00, 0, 20, 1000.00, 'Giá tiêu chuẩn AC', 'VND'
    ),
    (
        uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'CCS', 
        '2026-01-01 00:00:00+07', NULL, NULL, NULL, 0, 
        3858.00, 0, 20, 1000.00, 'Giá tiêu chuẩn DC', 'VND'
    );

-- 6. Station Incidents
INSERT INTO station_incidents (
    id, station_id, point_id, reported_by, description, severity, status, resolved_at
) VALUES 
    (
        uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380c31', 
        'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'Màn hình cảm ứng bị đơ không quét QR được', 
        'medium', 'pending_confirmation', NULL
    );

-- 7. Station Maintenance
INSERT INTO station_maintenance (
    id, station_id, start_time, end_time, reason, scheduled_by
) VALUES 
    (
        uuid_generate_v4(), 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 
        '2026-05-15 01:00:00+07', '2026-05-15 04:00:00+07', 
        'Bảo trì định kỳ tủ điện tổng toàn trạm', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22'
    );
