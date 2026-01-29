-- Migration V3: Seed "The Sprint" Plan

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
    'The Sprint',
    'A rolling 30-week challenge. Start anytime! Weekly targets with tiered fees and strict penalties.',
    3000,
    30,
    8, -- Approx 7.5 months
    0, -- Dynamic calculation
    'flexible', -- Min 3000 but can be more
    'sprint',
    '{
        "duration": 30,
        "penalty_amount": 500,
        "missed_week_recovery_amount": 3000,
        "tiers": [
            {"min": 3000, "max": 14000, "fee": 200},
            {"min": 14500, "max": 23000, "fee": 300},
            {"min": 23500, "max": 999999999, "fee": 500}
        ]
    }'::jsonb,
    true
);
