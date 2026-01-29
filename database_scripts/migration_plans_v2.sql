-- Migration Plans V2: Support for Specialized Plans (Marathon)

-- 1. Add columns to 'plans' table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'standard', -- 'standard', 'marathon', etc.
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb; -- Flexible config for plan-specific rules

-- 2. Add columns to 'user_plans' table
ALTER TABLE user_plans 
ADD COLUMN IF NOT EXISTS plan_metadata JSONB DEFAULT '{}'::jsonb; -- Store user-specific state (duration choice, current week progress)

-- 3. Seed "The Marathon Savings" Plan
-- We use ON CONFLICT DO NOTHING to avoid duplicates if run multiple times, 
-- but we need a unique constraints. If name isn't unique, we might insert duplicates. 
-- Best to check if exists or just insert.
INSERT INTO plans (
    name, 
    description, 
    min_amount, 
    duration_weeks, 
    duration_months,
    service_charge, 
    contribution_type, 
    type, 
    config,
    is_active
) VALUES (
    'The Marathon Savings',
    'A fixed-cycle savings challenge starting every 3rd week of January. Choose 30 or 48 weeks. Strict weekly targets.',
    3000,
    48, -- Max duration as default
    12, -- duration_months (48/4)
    0, -- Charges are tiered, calculated dynamically
    'flexible', -- User chooses amount >= 3000
    'marathon',
    '{
        "start_day_of_year_approx": 21, 
        "durations": [30, 48],
        "min_weekly_deposit": 3000,
        "penalty_amount": 500,
        "auto_debit_amount": 3000,
        "tiers": [
            {"min": 3000, "max": 14000, "fee": 200},
            {"min": 14500, "max": 23000, "fee": 300},
            {"min": 23500, "max": 999999999, "fee": 500}
        ]
    }'::jsonb,
    true
);
