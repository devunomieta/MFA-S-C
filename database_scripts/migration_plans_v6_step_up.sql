-- Migration: Seed "The Step-Up" Plan (v6)

INSERT INTO plans (
    name, 
    description, 
    type, 
    min_amount, 
    duration_weeks,
    duration_months,
    contribution_type, 
    is_active, 
    service_charge,
    config
) VALUES (
    'The Step-Up',
    'A weekly plan with fixed durations (10, 15, 20 weeks) and tiered amounts. Strict withdrawal at end of term.',
    'step_up',
    5000, -- Default Min (5k)
    0, -- Placeholder (handled in config)
    0, -- Placeholder
    'fixed',
    true,
    0, -- Dynamic Tiered Charges
    '{
        "durations": [10, 15, 20],
        "fixed_amounts": [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000],
        "fee_tiers": [
            {"min": 5000, "max": 10000, "fee": 200},
            {"min": 15000, "max": 20000, "fee": 300},
            {"min": 25000, "max": 30000, "fee": 400},
            {"min": 40000, "max": 50000, "fee": 500}
        ],
        "missed_payment_penalty": 500,
        "auto_debit": "weekly_sunday_06_00",
        "withdrawal_policy": "strict_term_end"
    }'::jsonb
);
