-- ==============================================================================
-- NOTIFICATION SERVICE SEED DATA
-- Purpose: Realistic demo data for user devices and notifications
-- ==============================================================================

-- 1. Notification Preferences
-- Lê Thảo Linh: c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21
-- Phạm Quốc Tuấn: c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22
INSERT INTO notification_preferences (
    user_id, enable_push, enable_realtime, enable_email, enable_sms, quiet_hours_start, quiet_hours_end
) VALUES 
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', true, true, true, false, 23, 6),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', true, true, false, true, 22, 7)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Devices (FCM Push Tokens)
INSERT INTO devices (
    id, user_id, platform, push_token, device_name, last_active_at
) VALUES 
    (
        uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'ios', 
        'eA1b2C3d4E5f6G7h8I9j0K:APA91bE_xyz_fake_token_for_iphone_15_pro_max_le_thao_linh_123', 
        'iPhone 15 Pro Max', '2026-05-01 10:00:00+07'
    ),
    (
        uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'android', 
        'fA1b2C3d4E5f6G7h8I9j0L:APA91bF_xyz_fake_token_for_samsung_s24_ultra_pham_quoc_tuan_456', 
        'Samsung Galaxy S24 Ultra', '2026-05-01 11:30:00+07'
    )
ON CONFLICT (push_token) DO NOTHING;

-- 3. Notifications
INSERT INTO notifications (
    id, user_id, type, channel, title, body, status, metadata, read_at
) VALUES 
    (
        uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'payment_success', 'push', 
        'Nạp tiền thành công', 
        'Bạn đã nạp thành công 500,000 VNĐ vào ví V-Green.', 
        'sent', 
        '{"amount": 500000, "transaction_id": "e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e21"}', 
        '2026-04-30 15:35:00+07'
    ),
    (
        uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'charging_started', 'push', 
        'Bắt đầu sạc', 
        'Phiên sạc của bạn tại Vincom Landmark 81 đã bắt đầu.', 
        'sent', 
        '{"station_name": "Vincom Center Landmark 81", "connector": "CCS"}', 
        '2026-04-30 15:40:00+07'
    ),
    (
        uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'charging_completed', 'push', 
        'Hoàn thành phiên sạc', 
        'Phiên sạc đã kết thúc. Số điện tiêu thụ: 35.5 kWh. Chi phí: 124,250 VNĐ.', 
        'sent', 
        '{"kwh": 35.5, "cost": 124250}', 
        NULL -- Unread
    ),
    (
        uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'booking_confirmed', 'push', 
        'Đặt lịch thành công', 
        'Đã giữ chỗ tại Vincom Times City. Vui lòng có mặt lúc 14:00.', 
        'sent', 
        '{"station_name": "Vincom Mega Mall Times City", "time": "14:00"}', 
        '2026-04-30 13:00:00+07'
    )
ON CONFLICT (id) DO NOTHING;
