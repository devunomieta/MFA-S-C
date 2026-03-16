-- Shared Service Charge Calculation Function
CREATE OR REPLACE FUNCTION calculate_plan_service_charge(
    p_plan_id UUID,
    p_amount NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    v_plan RECORD;
    v_tier RECORD;
BEGIN
    SELECT * INTO v_plan FROM plans WHERE id = p_plan_id;
    
    IF NOT FOUND THEN RETURN 0; END IF;
    
    -- 1. Percentage Charge
    IF v_plan.service_charge_type = 'percentage' THEN
        RETURN (p_amount * COALESCE(v_plan.service_charge_percentage, 0)) / 100;
    END IF;
    
    -- 2. Tiered Charge
    IF v_plan.service_charge_type = 'tiered' AND v_plan.service_charge_tiers IS NOT NULL THEN
        -- Find the matching tier
        -- Tier structure: { "min": 0, "max": 1000, "fee": 50 }
        FOR v_tier IN SELECT * FROM jsonb_to_recordset(v_plan.service_charge_tiers) AS x(min NUMERIC, max NUMERIC, fee NUMERIC)
        LOOP
            IF p_amount >= v_tier.min AND (v_tier.max IS NULL OR v_tier.max = 0 OR v_tier.max = 999999999 OR p_amount <= v_tier.max) THEN
                RETURN v_tier.fee;
            END IF;
        END LOOP;
    END IF;
    
    -- 3. Fixed Charge (Default)
    RETURN COALESCE(v_plan.service_charge_fixed, v_plan.service_charge, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to distribute service charge to admin wallet
CREATE OR REPLACE FUNCTION distribute_service_charge(
    p_user_id UUID,
    p_plan_id UUID,
    p_amount NUMERIC,
    p_description TEXT
) RETURNS VOID AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- 1. Get Admin Wallet ID
    SELECT (value->>0)::UUID INTO v_admin_id FROM app_settings WHERE key = 'admin_wallet_id';
    
    IF v_admin_id IS NULL THEN
        -- Fallback: Use the first admin found if not configured
        SELECT id INTO v_admin_id FROM profiles WHERE is_admin = true LIMIT 1;
    END IF;

    IF v_admin_id IS NOT NULL AND p_amount > 0 THEN
        -- 2. Credit Admin Wallet
        UPDATE user_plans 
        SET current_balance = current_balance + p_amount,
            updated_at = NOW()
        WHERE user_id = v_admin_id AND plan_id IS NULL;
        
        -- 3. Record Admin Revenue Transaction
        INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
        VALUES (v_admin_id, p_amount, 'revenue', 'completed', p_description || ' (Source: ' || p_user_id || ')', p_plan_id, 0);
    END IF;
END;
$$ LANGUAGE plpgsql;
