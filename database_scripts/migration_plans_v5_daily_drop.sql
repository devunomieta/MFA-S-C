-- Migration: Seed "The Daily Drop" Plan (v5)

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
    'The Daily Drop',
    'Flexible daily savings logic. Pick your duration (31, 62, 93 days, or Continuous). Build consistency with small daily drops.',
    'daily_drop',
    500,
    0, -- Duration Weeks (Placeholder for constraint)
    0, -- Duration Months (Placeholder for constraint)
    'fixed',
    true,
    0, -- Service Charge is dynamic (First Payment = 100% Fee)
    '{
        "durations": [31, 62, 93, -1],
        "fee_structure": "first_deposit_100_percent",
        "missed_payment_penalty": "none",
        "auto_debit": "daily_23_59"
    }'::jsonb
);
