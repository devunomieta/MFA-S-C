-- MARATHON SAVINGS BACKEND LOGIC

-- 1. Helper: Calculate Fee based on Amount and Plan Config
-- Returns the fee amount.
CREATE OR REPLACE FUNCTION calculate_marathon_fee(
    p_amount NUMERIC,
    p_plan_config JSONB,
    p_selected_duration INT,
    p_weeks_paid INT
) RETURNS NUMERIC AS $$
DECLARE
    v_tier JSONB;
    v_fee NUMERIC := 0;
    v_remaining_weeks INT;
BEGIN
    -- Tier Logic
    -- Loop through tiers to find match
    FOR v_tier IN SELECT * FROM jsonb_array_elements(p_plan_config->'tiers')
    LOOP
        IF p_amount >= (v_tier->>'min')::NUMERIC AND p_amount <= (v_tier->>'max')::NUMERIC THEN
            v_fee := (v_tier->>'fee')::NUMERIC;
            EXIT; -- Found tier
        END IF;
    END LOOP;

    RETURN v_fee;
END;
$$ LANGUAGE plpgsql;


-- 2. Transaction Processor for Marathon
-- Handles the deposit, fee deduction, and state update
CREATE OR REPLACE FUNCTION process_marathon_deposit(
    p_user_id UUID,
    p_plan_id UUID,
    p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_user_plan RECORD;
    v_plan RECORD;
    v_fee NUMERIC;
    v_net_amount NUMERIC;
    v_new_balance NUMERIC;
    v_weeks_paid INT;
    v_selected_duration INT;
    v_meta JSONB;
BEGIN
    -- Get Plan Details
    SELECT * INTO v_plan FROM plans WHERE id = p_plan_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;

    -- Get User Plan (Allow active or pending_activation)
    SELECT * INTO v_user_plan FROM user_plans 
    WHERE user_id = p_user_id AND plan_id = p_plan_id AND status IN ('active', 'pending_activation');
    
    IF NOT FOUND THEN RAISE EXCEPTION 'User is not active in this plan'; END IF;

    v_meta := v_user_plan.plan_metadata;
    v_weeks_paid := COALESCE((v_meta->>'total_weeks_paid')::INT, 0);
    v_selected_duration := COALESCE((v_meta->>'selected_duration')::INT, v_plan.duration_weeks);

    -- Check if Plan is completed
    IF v_weeks_paid >= v_selected_duration THEN
        RAISE EXCEPTION 'Plan completed. No more deposits allowed.';
    END IF;

    -- Calculate Fee
    v_fee := calculate_marathon_fee(p_amount, v_plan.config, v_selected_duration, v_weeks_paid);
    v_net_amount := p_amount - v_fee;

    -- Update Balance and Metadata
    v_new_balance := v_user_plan.current_balance + v_net_amount;
    
    -- [NEW] Calculate how many weeks this payment covers (Auto-Spread)
    -- Mandated minimum is 3000 for Marathon.
    v_weeks_paid := v_weeks_paid + FLOOR(p_amount / 3000)::INT;
    
    -- Ensure we don't exceed duration
    IF v_weeks_paid > v_selected_duration THEN
        v_weeks_paid := v_selected_duration;
    END IF;
    
    -- Update JSON metadata safely
    v_meta := jsonb_set(v_meta, '{total_weeks_paid}', to_jsonb(v_weeks_paid));
    v_meta := jsonb_set(v_meta, '{last_payment_date}', to_jsonb(now()));
    
    -- TODO: Arrears calculation should be re-evaluated here or in a separate job
    -- For now, we assume this deposit might clear one week of arrears if it existed

    UPDATE user_plans 
    SET 
        current_balance = v_new_balance,
        plan_metadata = v_meta,
        status = 'active', -- Activate plan if it was pending
        updated_at = now()
    WHERE id = v_user_plan.id;

    -- Record Transaction
    INSERT INTO transactions (
        user_id, 
        plan_id, 
        amount, 
        type, 
        description, 
        reference, 
        status
    ) VALUES (
        p_user_id,
        p_plan_id,
        p_amount,
        'deposit',
        'Weekly Contribution (Week ' || v_weeks_paid || ')',
        'MAR-' || floor(extract(epoch from now())),
        'completed'
    );
    
    -- If fee > 0, record fee transaction? 
    -- Usually better to just record the NET deposit or record Gross + separate Fee.
    -- Let's record the FEE separately for transparency.
    IF v_fee > 0 THEN
        INSERT INTO transactions (
            user_id, 
            plan_id, 
            amount, 
            type, 
            description, 
            status
        ) VALUES (
            p_user_id,
            p_plan_id,
            v_fee,
            'fee',
            'Service Charge (Week ' || v_weeks_paid || ')',
            'completed'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', v_new_balance, 
        'week_paid', v_weeks_paid,
        'fee_charged', v_fee
    );
END;
$$ LANGUAGE plpgsql;


-- 3. Auto-Save Logic (Cron/Admin Trigger)
-- Checks all Active Marathon users. 
-- If they haven't paid for the "current chronological week" (determined by start_date vs now), try to deduct from Wallet.
-- Marathon is flexible, but "Auto-Save" implies keeping up with the schedule.
-- We assume "Schedule" = 1 week per week since start.
CREATE OR REPLACE FUNCTION trigger_marathon_auto_save()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    amount_needed NUMERIC,
    status TEXT
) AS $$
DECLARE
    r RECORD;
    wallet_bal NUMERIC;
    weeks_elapsed INT;
    weeks_paid INT;
    min_amount NUMERIC := 3000; -- Default min
    p_profile RECORD;
BEGIN
    FOR r IN
        SELECT 
            up.id as user_plan_id, 
            up.user_id, 
            up.plan_id,
            up.start_date,
            up.plan_metadata
        FROM user_plans up
        JOIN plans p ON up.plan_id = p.id
        WHERE p.type = 'marathon' AND up.status = 'active'
    LOOP
        -- Calculate Weeks Elapsed since Start
        weeks_elapsed := FLOOR(EXTRACT(EPOCH FROM (NOW() - r.start_date)) / 604800)::INT;
        
        -- Weeks Paid
        weeks_paid := COALESCE((r.plan_metadata->>'total_weeks_paid')::INT, 0);

        -- If fell behind schedule (Weeks Elapsed > Weeks Paid)
        -- We try to catch up 1 week
        IF weeks_elapsed > weeks_paid THEN
            
            -- Get Profile Name
            SELECT full_name INTO p_profile FROM profiles WHERE id = r.user_id;

            -- Check General Wallet Balance
            SELECT COALESCE(SUM(
                CASE
                    WHEN type IN ('deposit', 'loan_disbursement', 'limit_transfer') AND status = 'completed' THEN amount
                    WHEN type IN ('withdrawal', 'loan_repayment') AND status IN ('completed', 'pending') THEN -amount - COALESCE(charge, 0)
                    WHEN type = 'transfer' AND status = 'completed' THEN -amount - COALESCE(charge, 0) 
                    ELSE 0
                END
            ), 0) INTO wallet_bal
            FROM transactions
            WHERE user_id = r.user_id AND plan_id IS NULL;

            IF wallet_bal >= min_amount THEN
                -- Deduct from Wallet
                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (r.user_id, min_amount, 'transfer', 'completed', 'Auto-Save for Marathon', NULL, 0);

                -- Credit Marathon via RPC
                PERFORM process_marathon_deposit(r.user_id, r.plan_id, min_amount);

                user_id := r.user_id;
                full_name := p_profile.full_name;
                amount_needed := min_amount;
                status := 'Covered';
                RETURN NEXT;
            ELSE
                 user_id := r.user_id;
                 full_name := p_profile.full_name;
                 amount_needed := min_amount;
                 status := 'Insufficient Funds';
                 RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
