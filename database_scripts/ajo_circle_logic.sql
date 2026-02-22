-- The Ajo Circle Logic

-- 1. Process Deposit
-- Called when user deposits specifically to Ajo Circle
-- Expects p_amount to be the Contribution Amount. The FEE is handled separately/implicitly or passed?
-- In DepositModal, we usually transfer "Total" (Amount + Fee) from Wallet?
-- OR we transfer Amount and Fee separately?
-- Let's stick to the pattern:
-- Wallet -> Transfer Total -> Logic Splits it? 
-- Actually, `process_..._deposit` is usually called AFTER the deduction from General Wallet.
-- But wait, `DepositModal` deduction logic for other plans was "Transfer X to Plan".
-- For Ajo Circle, if user picks 10k, they pay 10,200.
-- DepositModal will deduct 10,200.
-- Then pass 10,200 to this RPC? Or 10,000?
-- Let's say we pass the GROSS amount (10,200). We need to split it here.
-- OR, we pass the "Base Amount" (10,000) and this function assumes the Fee was already handled?
-- Better: Pass GROSS Amount.

CREATE OR REPLACE FUNCTION process_ajo_circle_deposit(
    p_user_id UUID,
    p_plan_id UUID,
    p_amount NUMERIC -- Verified Gross Amount (e.g. 10200) from Backend/Frontend checks
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_plan RECORD;
    v_plan_config JSONB;
    v_fees JSONB;
    v_fixed_amount NUMERIC;
    v_expected_fee NUMERIC;
    v_metadata JSONB;
    v_current_week INTEGER;
    v_contribution_amount NUMERIC;
BEGIN
    -- Get User Plan
    SELECT * INTO v_user_plan 
    FROM user_plans 
    WHERE user_id = p_user_id AND plan_id = p_plan_id
    LIMIT 1;

    IF NOT FOUND THEN RAISE EXCEPTION 'User Plan not found'; END IF;

    -- Get Plan Config (for Fee verification)
    SELECT config INTO v_plan_config FROM plans WHERE id = p_plan_id;
    v_fees := v_plan_config->'fees';
    
    v_metadata := v_user_plan.plan_metadata;
    v_fixed_amount := (v_metadata->>'fixed_amount')::NUMERIC;
    v_current_week := COALESCE((v_metadata->>'current_week')::INTEGER, 1);

    -- Calculate Fee based on official table
    v_expected_fee := CASE 
        WHEN v_fixed_amount >= 100000 THEN 1000
        WHEN v_fixed_amount >= 50000 THEN 500
        WHEN v_fixed_amount >= 30000 THEN 500
        WHEN v_fixed_amount >= 25000 THEN 500
        WHEN v_fixed_amount >= 20000 THEN 500
        WHEN v_fixed_amount >= 15000 THEN 300
        WHEN v_fixed_amount >= 10000 THEN 200
        ELSE 0 
    END;

    -- Check if Amount matches (Contribution + Fee) or just Contribution?
    -- Allow flexibility slightly? No, fixed.
    IF p_amount < (v_fixed_amount + v_expected_fee) THEN
        RAISE EXCEPTION 'Insufficient amount for Ajo Circle. Expected % + %', v_fixed_amount, v_expected_fee;
    END IF;

    v_contribution_amount := v_fixed_amount;

    -- 1. Credit User Plan with Contribution Only
    UPDATE user_plans
    SET 
        current_balance = current_balance + v_contribution_amount,
        plan_metadata = jsonb_set(
            jsonb_set(
                v_metadata, 
                '{last_payment_date}', 
                to_jsonb(NOW())
            ),
            '{week_paid}', -- Mark current week as paid? Or count totals?
            to_jsonb(true) -- Simple flag for 'This week is paid'
        ),
        updated_at = NOW()
    WHERE id = v_user_plan.id;

    -- 2. Record Fee Transaction
    -- Since the funds came into the Plan temporarily (via the Transfer to Plan_ID),
    -- we technically need to Debit the Fee OUT of the plan?
    -- Method:
    -- Wallet -> (Transfer Total) -> Plan Balance increased by Total (temporarily or via logic?)
    -- Wait, `process_...` is called. The caller (DepositModal) does:
    -- 1. Wallet Debit check.
    -- 2. RPC Call.
    -- The RPC is responsible for updating the plan balance.
    -- So `p_amount` is just a number. It hasn't been "added" to `user_plans.current_balance` yet unless we do it here.
    
    -- Correct Flow:
    -- Caller: Debits Wallet (Gross).
    -- RPC: 
    --   Adds Net (Contribution) to Plan Balance.
    --   Records 'Service Charge' Transaction for the Fee (Plan ID associated, but Amount is Fee).

    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, p_plan_id, v_expected_fee, 'service_charge', 'completed', 'Ajo Circle Weekly Fee', 0);
    
    -- We also need to record the Deposit Transaction for the Contribution
    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, p_plan_id, v_contribution_amount, 'deposit', 'completed', 'Ajo Circle Contribution', 0);

    RETURN jsonb_build_object(
        'success', true,
        'week', v_current_week,
        'contribution', v_contribution_amount,
        'fee', v_expected_fee
    );
END;
$$;


-- 2. Auto-Save (Saturday 6AM - Sunday 11:45PM)
CREATE OR REPLACE FUNCTION trigger_ajo_circle_auto_save()
RETURNS TABLE (
    user_id UUID,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan_id UUID;
    v_user_plan RECORD;
    v_metadata JSONB;
    v_fixed_amount NUMERIC;
    v_fees JSONB;
    v_expected_fee NUMERIC;
    v_gross_amount NUMERIC;
    v_wallet_bal NUMERIC;
    v_week_paid BOOLEAN;
BEGIN
    SELECT id, config INTO v_plan_id, v_fees FROM plans WHERE type = 'ajo_circle' LIMIT 1;
    v_fees := v_fees->'fees'; -- Extract inner fees object if needed, checking structure

    FOR v_user_plan IN 
        SELECT * FROM user_plans 
        WHERE plan_id = v_plan_id 
        AND status = 'active'
    LOOP
        v_metadata := v_user_plan.plan_metadata;
        v_week_paid := COALESCE((v_metadata->>'week_paid')::BOOLEAN, false);
        
        IF NOT v_week_paid THEN
            v_fixed_amount := (v_metadata->>'fixed_amount')::NUMERIC;
            v_expected_fee := COALESCE((v_fees->>v_fixed_amount::TEXT)::NUMERIC, 0);
            v_gross_amount := v_fixed_amount + v_expected_fee;

            -- Check Wallet
            SELECT current_balance INTO v_wallet_bal FROM user_plans WHERE user_id = v_user_plan.user_id AND plan_id IS NULL;
            
            IF v_wallet_bal >= v_gross_amount THEN
                -- Debit Wallet
                UPDATE user_plans SET current_balance = current_balance - v_gross_amount
                WHERE user_id = v_user_plan.user_id AND plan_id IS NULL;
                
                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (v_user_plan.user_id, v_gross_amount, 'debit', 'completed', 'Auto-Save: Ajo Circle', NULL, 0);
                
                -- Credit Plan (Net)
                UPDATE user_plans SET 
                    current_balance = current_balance + v_fixed_amount,
                    plan_metadata = jsonb_set(v_metadata, '{week_paid}', to_jsonb(true))
                WHERE id = v_user_plan.id;

                -- Record Fee
                INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
                VALUES (v_user_plan.user_id, v_plan_id, v_expected_fee, 'service_charge', 'completed', 'Auto-Save Fee', 0);
                
                -- Record Deposit
                INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
                VALUES (v_user_plan.user_id, v_plan_id, v_fixed_amount, 'deposit', 'completed', 'Auto-Save Deposit', 0);

                RETURN QUERY SELECT v_user_plan.user_id, 'Covered';
            ELSE
                 RETURN QUERY SELECT v_user_plan.user_id, 'Insufficient';
            END IF;
        END IF;
    END LOOP;
END;
$$;


-- 3. Settle Week (Sunday 11:59PM)
CREATE OR REPLACE FUNCTION settle_ajo_circle_week()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan_id UUID;
    v_user_plan RECORD;
    v_metadata JSONB;
    v_week_paid BOOLEAN;
    v_current_week INTEGER;
    v_penalty NUMERIC := 500;
    v_fixed_amount NUMERIC;
    v_missed_weeks INTEGER;
BEGIN
    SELECT id INTO v_plan_id FROM plans WHERE type = 'ajo_circle' LIMIT 1;
    
    FOR v_user_plan IN 
        SELECT * FROM user_plans WHERE plan_id = v_plan_id AND status = 'active'
    LOOP
        v_metadata := v_user_plan.plan_metadata;
        v_week_paid := COALESCE((v_metadata->>'week_paid')::BOOLEAN, false);
        v_current_week := COALESCE((v_metadata->>'current_week')::INTEGER, 1);
        v_fixed_amount := (v_metadata->>'fixed_amount')::NUMERIC;
        v_missed_weeks := COALESCE((v_metadata->>'missed_weeks')::INTEGER, 0);

        IF NOT v_week_paid THEN
            -- Apply Penalty
            -- Deduct from SAVED balance
            UPDATE user_plans 
            SET current_balance = current_balance - v_penalty
            WHERE id = v_user_plan.id;
            
            INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
            VALUES (v_user_plan.user_id, v_plan_id, v_penalty, 'service_charge', 'completed', 'Ajo Circle Missed Week Penalty', 0);
            
            v_missed_weeks := v_missed_weeks + 1;
        END IF;

        -- Increment Week
        -- Reset week_paid
        UPDATE user_plans 
        SET plan_metadata = jsonb_set(
            jsonb_set(
                jsonb_set(v_metadata, '{current_week}', to_jsonb(v_current_week + 1)),
                '{week_paid}', to_jsonb(false)
            ),
            '{missed_weeks}', to_jsonb(v_missed_weeks)
        )
        WHERE id = v_user_plan.id;

    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;
