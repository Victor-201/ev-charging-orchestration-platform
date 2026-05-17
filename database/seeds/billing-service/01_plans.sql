-- ============================================
-- Service : billing-service
-- Table   : plans
-- File    : database/seeds/billing-service/01_plans.sql
-- Depends : none
-- Records : 3
-- ============================================
SET session_replication_role = replica;
BEGIN;
  TRUNCATE TABLE plans CASCADE;

INSERT INTO plans (id, name, plan_type, price_amount, duration_days) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Basic', 'basic', 0, 30),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Standard', 'standard', 199000, 30),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Premium', 'premium', 399000, 30);


COMMIT;
SET session_replication_role = DEFAULT;
