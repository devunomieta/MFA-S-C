-- Seed "The Anchor" Plan

INSERT INTO plans (
    name, 
    description, 
    service_charge, 
    duration_weeks, 
    duration_months,
    min_amount, 
    contribution_type, 
    whatsapp_link, 
    is_active, 
    type,
    config
) VALUES (
    'The Anchor', 
    'A 48-week disciplined savings challenge. Build a solid financial foundation with weekly targets and strict accountability.', 
    0, -- Dynamic Tiered Charges
    48,
    12, 
    3000, 
    'flexible', 
    'https://chat.whatsapp.com/ExampleAnchorLink', 
    true, 
    'anchor',
    '{
        "durations": [48], 
        "tiers": [
            {"min": 3000, "max": 14000, "fee": 200},
            {"min": 14500, "max": 23000, "fee": 300},
            {"min": 23500, "max": 999999999, "fee": 500}
        ],
        "penalty_amount": 500
    }'::jsonb
);
