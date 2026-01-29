-- Migration Plan v7: The Monthly Bloom

-- 1. Insert "The Monthly Bloom" into plans table
INSERT INTO plans (
    name,
    description,
    min_amount,
    duration_weeks,
    duration_months,
    service_charge,
    created_at,
    type,
    contribution_type,
    whatsapp_link,
    is_active,
    config,
    fixed_amount
) VALUES (
    'The Monthly Bloom',
    'Flexible duration (4-12 months). Monthly target (Min ₦20,000). ₦2,000 monthly fee.',
    20000, -- Min Amount / Target Base
    0, -- Placeholder, user selects duration
    0, -- Placeholder
    2000, -- Fixed Monthly Charge
    NOW(),
    'monthly_bloom',
    'fixed', -- Contribution is fixed monthly target
    'https://chat.whatsapp.com/monthly-bloom-group',
    true,
    '{"min_duration_months": 4, "max_duration_months": 12}',
    NULL -- User selects amount, so fixed_amount is null in template, set in user_plan metadata
);
