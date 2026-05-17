-- ============================================
-- Service : ev-infrastructure-service
-- Table   : cities
-- File    : database/seeds/ev-infrastructure-service/01_cities.sql
-- Depends : none
-- Records : 50
-- ============================================
SET session_replication_role = replica;
BEGIN;
  TRUNCATE TABLE cities CASCADE;

INSERT INTO cities (id, city_name, region) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'Hà Nội', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000002', 'Hải Phòng', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000003', 'Bắc Ninh', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000004', 'Hưng Yên', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000005', 'Hải Dương', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000006', 'Nam Định', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000007', 'Thái Bình', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000008', 'Hà Nam', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000009', 'Quảng Ninh', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000010', 'Lạng Sơn', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000011', 'Bắc Giang', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000012', 'Thái Nguyên', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000013', 'Lào Cai', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000014', 'Hòa Bình', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000015', 'Sơn La', 'Miền Bắc'),
  ('cccccccc-0000-0000-0000-000000000016', 'Thanh Hóa', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000017', 'Nghệ An', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000018', 'Thừa Thiên Huế', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000019', 'Hà Tĩnh', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000020', 'Quảng Bình', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000021', 'Quảng Trị', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000022', 'Đà Nẵng', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000023', 'Khánh Hòa', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000024', 'Quảng Nam', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000025', 'Bình Thuận', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000026', 'Bình Định', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000027', 'Phú Yên', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000028', 'Quảng Ngãi', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000029', 'Lâm Đồng', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000030', 'Đắk Lắk', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000031', 'Gia Lai', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000032', 'Đắk Nông', 'Miền Trung'),
  ('cccccccc-0000-0000-0000-000000000033', 'TP. Hồ Chí Minh', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000034', 'Bình Dương', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000035', 'Đồng Nai', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000036', 'Bà Rịa - Vũng Tàu', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000037', 'Tây Ninh', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000038', 'Bình Phước', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000039', 'Cần Thơ', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000040', 'Long An', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000041', 'Tiền Giang', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000042', 'Kiên Giang', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000043', 'An Giang', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000044', 'Vĩnh Long', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000045', 'Đồng Tháp', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000046', 'Bến Tre', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000047', 'Hậu Giang', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000048', 'Sóc Trăng', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000049', 'Trà Vinh', 'Miền Nam'),
  ('cccccccc-0000-0000-0000-000000000050', 'Bạc Liêu', 'Miền Nam');


COMMIT;
SET session_replication_role = DEFAULT;
