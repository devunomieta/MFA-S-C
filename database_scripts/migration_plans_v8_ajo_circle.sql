-- Migration: Seed "The Ajo Circle" Plan (v8)

DO $$ 
DECLARE
    v_plan_id UUID;
    v_config JSONB;
BEGIN
    -- Config: Amounts and Fees
    v_config := jsonb_build_object(
        'amounts', jsonb_build_array(10000, 15000, 20000, 25000, 30000, 50000, 100000),
        'fees', jsonb_build_object(
            '10000', 200,
            '15000', 300,
            '20000', 500,
            '25000', 500,
            '30000', 500,
            '50000', 500,
            '100000', 1000
        ),
        'duration_weeks', 10,
        'max_picking_turns', 2
    );

    -- Insert Plan
    -- Check if Plan Exists
    IF EXISTS (SELECT 1 FROM plans WHERE name = 'The Ajo Circle') THEN
        UPDATE plans 
        SET config = v_config, type = 'ajo_circle', contribution_type = 'fixed'
        WHERE name = 'The Ajo Circle';
    ELSE
        INSERT INTO plans (name, description, service_charge, duration_weeks, duration_months, min_amount, type, is_active, contribution_type, config)
        VALUES (
            'The Ajo Circle',
            '10-week rotational contribution. Pick your turn to cash out!',
            0, -- Service charge is dynamic based on amount
            10,
            3, -- duration_months (approx 10 weeks)
            10000, -- Min entry
            'ajo_circle',
            true,
            'fixed',
            v_config
        );
    END IF;

    -- Get Plan ID
    SELECT id INTO v_plan_id FROM plans WHERE type = 'ajo_circle' LIMIT 1;
    
    RAISE NOTICE 'Seeded The Ajo Circle Plan: %', v_plan_id;
END $$;
