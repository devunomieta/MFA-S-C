-- Migration: Add dynamic service charge columns to plans table

-- 1. Add columns
ALTER TABLE plans ADD COLUMN IF NOT EXISTS service_charge_type TEXT DEFAULT 'fixed' CHECK (service_charge_type IN ('fixed', 'percentage', 'tiered'));
ALTER TABLE plans ADD COLUMN IF NOT EXISTS service_charge_fixed NUMERIC;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS service_charge_percentage NUMERIC;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS service_charge_tiers JSONB;

-- 2. Migrate existing data
UPDATE plans SET service_charge_fixed = service_charge WHERE service_charge_fixed IS NULL;

-- 3. Update existing specialized plans with their known tier logic (optional but helpful)
-- Marathon
UPDATE plans SET 
    service_charge_type = 'tiered',
    service_charge_tiers = '[{"min": 3000, "max": 14000, "fee": 200}, {"min": 14500, "max": 23000, "fee": 300}, {"min": 23500, "max": 999999999, "fee": 500}]'::jsonb
WHERE type = 'marathon';

-- Ajo Circle (Official table)
UPDATE plans SET 
    service_charge_type = 'tiered',
    service_charge_tiers = '[{"min": 10000, "max": 14999, "fee": 200}, {"min": 15000, "max": 19999, "fee": 300}, {"min": 20000, "max": 999999, "fee": 500}, {"min": 100000, "max": 999999999, "fee": 1000}]'::jsonb
WHERE type = 'ajo_circle';

-- Step Up
UPDATE plans SET 
    service_charge_type = 'tiered',
    service_charge_tiers = '[{"min": 5000, "max": 10000, "fee": 200}, {"min": 15000, "max": 20000, "fee": 300}, {"min": 25000, "max": 30000, "fee": 400}, {"min": 40000, "max": 50000, "fee": 500}]'::jsonb
WHERE type = 'step_up';
