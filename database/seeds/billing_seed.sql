-- ==============================================================================
-- BILLING SERVICE SEED DATA
-- Purpose: Realistic demo data for wallet, transactions, and subscriptions
-- ==============================================================================

-- 1. Plans (Subscription packages)
INSERT INTO plans (
    id, name, plan_type, price_amount, price_currency, duration_days, description, is_active
) VALUES 
    ('a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'Gói Tiêu Chuẩn', 'basic', 0, 'VND', 36500, 'Gói mặc định cho mọi người dùng, tính phí theo từng lần sạc', true),
    ('a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Gói Nâng Cao', 'standard', 150000, 'VND', 30, 'Giảm 5% giá điện, đặt lịch trước 48h', true),
    ('a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Gói Cao Cấp', 'premium', 350000, 'VND', 30, 'Giảm 10% giá điện, miễn phí 2 giờ đỗ quá giờ, ưu tiên hàng đợi', true)
ON CONFLICT (name) DO NOTHING;

-- 2. User Read Models (Denormalized from IAM)
-- Le Thao Linh: c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21
-- Pham Quoc Tuan: c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22
INSERT INTO user_read_models (
    user_id, email, full_name, is_active
) VALUES 
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'lethaolinh@gmail.com', 'Lê Thảo Linh', true),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'phamquoctuan@gmail.com', 'Phạm Quốc Tuấn', true)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Wallets
INSERT INTO wallets (
    id, user_id, currency, status
) VALUES 
    ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380d21', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'VND', 'active'),
    ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380d22', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'VND', 'active')
ON CONFLICT (user_id) DO NOTHING;

-- 4. Transactions (Topup & Payment)
-- TX 1: Le Thao Linh nạp tiền qua VNPay
-- TX 2: Le Thao Linh thanh toán sạc
-- TX 3: Pham Quoc Tuan nạp tiền qua Bank Transfer
INSERT INTO transactions (
    id, user_id, type, amount, currency, method, related_id, related_type, external_id, reference_code, status, meta
) VALUES 
    (
        'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e21', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'topup', 500000, 'VND', 'bank_transfer', 
        NULL, NULL, 'VNPAY987654321', 'TOPUP-LTL-001', 'completed', '{"bank": "NCB", "note": "Nap tien vao vi"}'
    ),
    (
        'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e22', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'payment', 125000, 'VND', 'wallet', 
        'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380f21', 'charging_session', NULL, 'PAY-LTL-001', 'completed', '{"session_id": "f2eebc99-9c0b-4ef8-bb6d-6bb9bd380f21"}'
    ),
    (
        'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e23', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'topup', 1000000, 'VND', 'bank_transfer', 
        NULL, NULL, 'VNPAY123456789', 'TOPUP-PQT-001', 'completed', '{"bank": "MBBANK", "note": "Nap tien mien phi"}'
    )
ON CONFLICT (reference_code) DO NOTHING;

-- 5. Wallet Ledger (Audit trail cho số dư ví)
-- Tính toán logic balance: LTL nạp 500k -> số dư 500k. LTL tiêu 125k -> số dư 375k.
INSERT INTO wallet_ledger (
    id, wallet_id, transaction_id, delta_amount, balance_after
) VALUES 
    (uuid_generate_v4(), 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380d21', 'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e21', 500000, 500000),
    (uuid_generate_v4(), 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380d21', 'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e22', -125000, 375000),
    (uuid_generate_v4(), 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380d22', 'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e23', 1000000, 1000000)
ON CONFLICT (transaction_id) DO NOTHING;

-- 6. Invoices
INSERT INTO invoices (
    id, transaction_id, user_id, total_amount, due_date, status
) VALUES 
    (uuid_generate_v4(), 'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380e22', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 125000, NULL, 'paid')
ON CONFLICT (transaction_id) DO NOTHING;

-- 7. Subscriptions
INSERT INTO subscriptions (
    id, user_id, plan_id, start_date, end_date, auto_renew, status
) VALUES 
    (uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c21', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '2026-04-15 00:00:00+07', '2026-05-15 00:00:00+07', true, 'active'),
    (uuid_generate_v4(), 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', '2026-04-01 00:00:00+07', '2026-05-01 00:00:00+07', true, 'active');
