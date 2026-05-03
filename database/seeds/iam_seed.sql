-- ==============================================================================
-- IAM SERVICE SEED DATA
-- Purpose: Realistic demo data for users, roles, staff, and vehicles
-- ==============================================================================

-- 1. Roles
INSERT INTO roles (
    id, name, description, is_system
) VALUES 
    ('f4eebc99-9c0b-4ef8-bb6d-6bb9bd380f41', 'admin', 'System Administrator', true),
    ('f4eebc99-9c0b-4ef8-bb6d-6bb9bd380f42', 'operator', 'Station Operator', true),
    ('f4eebc99-9c0b-4ef8-bb6d-6bb9bd380f43', 'user', 'End User (EV Driver)', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Users (Lưu ý: Mật khẩu đã được hash bằng bcrypt, mặc định là 'Password123!')
-- Lê Thảo Linh: c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21 (Khớp với Billing)
-- Phạm Quốc Tuấn: c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22 (Khớp với Billing)
-- Nguyễn Văn An (Admin): a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41
INSERT INTO users (
    id, email, full_name, phone, date_of_birth, password_hash, status, email_verified
) VALUES 
    (
        'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'lethaolinh@gmail.com', 'Lê Thảo Linh', '+84912345678', 
        '1995-08-15', '$2b$10$X8L.Jz9mHk/u7v1N.H9X3.U2c8P/M2Q3G7v6H2M3Q2', 'active', true
    ),
    (
        'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'phamquoctuan@gmail.com', 'Phạm Quốc Tuấn', '+84987654321', 
        '1988-11-20', '$2b$10$X8L.Jz9mHk/u7v1N.H9X3.U2c8P/M2Q3G7v6H2M3Q2', 'active', true
    ),
    (
        'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'nguyenvanan@gmail.com', 'Nguyễn Văn An', '+84901234567', 
        '1985-02-28', '$2b$10$X8L.Jz9mHk/u7v1N.H9X3.U2c8P/M2Q3G7v6H2M3Q2', 'active', true
    )
ON CONFLICT (email) DO NOTHING;

-- 3. User Roles
INSERT INTO user_roles (user_id, role_id) VALUES 
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380f43'), -- Linh: user
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380f43'), -- Tuan: user
    ('a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380f41')  -- An: admin
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. User Profiles
INSERT INTO user_profiles (
    user_id, avatar_url, address
) VALUES 
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'https://storage.example.com/avatars/lethaolinh.jpg', 'Khu Đô Thị Sala, Phường An Lợi Đông, Quận 2, TP. Hồ Chí Minh'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'https://storage.example.com/avatars/phamquoctuan.jpg', 'Vinhomes Central Park, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh'),
    ('a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'https://storage.example.com/avatars/nguyenvanan.jpg', 'Trụ sở chính V-Green, Hà Nội')
ON CONFLICT (user_id) DO NOTHING;

-- 5. Staff Profiles (An is an admin and operator)
INSERT INTO staff_profiles (
    id, user_id, station_id, station_name, position, shift, hire_date
) VALUES 
    (
        uuid_generate_v4(), 'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 
        'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Trạm sạc Vincom Center Landmark 81',
        'manager', 'morning', '2025-01-01'
    )
ON CONFLICT (user_id) DO NOTHING;

-- 6. Vehicle Models (Các mẫu xe thực tế trên thị trường)
-- VinFast VF8: b4eebc99-9c0b-4ef8-bb6d-6bb9bd380b41
-- Porsche Taycan: b4eebc99-9c0b-4ef8-bb6d-6bb9bd380b42
INSERT INTO vehicle_models (
    id, brand, model_name, year, battery_capacity_kwh, usable_capacity_kwh, default_charge_port, max_ac_power_kw, max_dc_power_kw
) VALUES 
    ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380b41', 'VinFast', 'VF 8 Plus', 2024, 87.70, 82.00, 'CCS', 11.00, 250.00),
    ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380b42', 'Porsche', 'Taycan 4S', 2024, 93.40, 83.70, 'CCS', 22.00, 270.00),
    ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380b43', 'VinFast', 'VF e34', 2023, 42.00, 41.50, 'CCS', 7.40, 60.00)
ON CONFLICT DO NOTHING;

-- 7. Vehicles
INSERT INTO vehicles (
    id, owner_id, model_id, plate_number, color, is_primary, mac_address, autocharge_enabled
) VALUES 
    (
        uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'b4eebc99-9c0b-4ef8-bb6d-6bb9bd380b41', 
        '51H-123.45', 'Xanh lam', true, '00:1A:2B:3C:4D:5E', true
    ),
    (
        uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'b4eebc99-9c0b-4ef8-bb6d-6bb9bd380b42', 
        '30G-678.90', 'Đen', true, '00:1A:2B:3C:4D:5F', true
    )
ON CONFLICT (plate_number) DO NOTHING;

-- 8. Users Cache (Cache cho API gateway đọc nhanh)
INSERT INTO users_cache (
    user_id, email, full_name, phone, role_name, status, email_verified, has_outstanding_debt, arrears_amount
) VALUES 
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'lethaolinh@gmail.com', 'Lê Thảo Linh', '+84912345678', 'user', 'active', true, false, 0),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'phamquoctuan@gmail.com', 'Phạm Quốc Tuấn', '+84987654321', 'user', 'active', true, false, 0),
    ('a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'nguyenvanan@gmail.com', 'Nguyễn Văn An', '+84901234567', 'admin', 'active', true, false, 0)
ON CONFLICT (user_id) DO NOTHING;
