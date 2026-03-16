-- MARATHON SAVINGS BACKEND LOGIC

-- Fees are now handled by shared calculate_plan_service_charge function


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
    v_fee NUMERIC := 0;
    v_net_amount NUMERIC;
    v_new_balance NUMERIC;
    v_weeks_paid INT;
    v_selected_duration INT;
    v_meta JSONB;
    v_last_fee_date TIMESTAMPTZ;
BEGIN
    -- Get User Plan (Allow active or pending_activation)
    SELECT * INTO v_user_plan FROM user_plans 
    WHERE id = p_plan_id AND user_id = p_user_id AND status IN ('active', 'pending_activation');
    
    IF NOT FOUND THEN RAISE EXCEPTION 'User is not active in this plan'; END IF;

    -- Get Plan Details (Template)
    SELECT * INTO v_plan FROM plans WHERE id = v_user_plan.plan_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;

    v_meta := v_user_plan.plan_metadata;
    v_weeks_paid := COALESCE((v_meta->>'total_weeks_paid')::INT, 0);
    v_selected_duration := COALESCE((v_meta->>'selected_duration')::INT, v_plan.duration_weeks);
    v_last_fee_date := (v_meta->>'last_fee_date')::TIMESTAMPTZ;

    -- Check if Plan is completed
    IF v_weeks_paid >= v_selected_duration THEN
        RAISE EXCEPTION 'Plan completed. No more deposits allowed.';
    END IF;

    -- Charge Logic: Immediate deduction if due (Weekly)
    IF v_last_fee_date IS NULL OR v_last_fee_date <= (now() - INTERVAL '1 week') THEN
        v_fee := calculate_plan_service_charge(v_plan.id, p_amount);
        
        IF p_amount < v_fee THEN
            RAISE EXCEPTION 'This deposit must cover the Service Charge (%s)', v_fee;
        END IF;
        
        v_meta := jsonb_set(v_meta, '{last_fee_date}', to_jsonb(now()));
        
        -- Distribute Fee to Admin
        PERFORM distribute_service_charge(p_user_id, v_user_plan.plan_id, v_fee, 'Marathon Weekly Service Charge');
        
        -- Record Fee Transaction
        INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
        VALUES (p_user_id, v_user_plan.plan_id, v_fee, 'fee', 'completed', 'Weekly Service Charge (Immediate)', 0);
    END IF;

    v_net_amount := p_amount - v_fee;

    -- Update Balance and Metadata
    v_new_balance := v_user_plan.current_balance + v_net_amount;
    
    -- [NEW] Calculate how many weeks this payment covers (Auto-Spread)
    DECLARE
        v_base_target NUMERIC := COALESCE((v_meta->>'fixed_amount')::NUMERIC, 3000);
        v_new_weeks_done INT;
    BEGIN
        v_new_weeks_done := v_weeks_paid + FLOOR(v_net_amount / v_base_target)::INT;
        IF v_new_weeks_done > v_selected_duration THEN
            v_weeks_paid := v_selected_duration;
        ELSE
            v_weeks_paid := v_new_weeks_done;
        END IF;
    END;
    
    -- Update JSON metadata safely
    v_meta := jsonb_set(v_meta, '{total_weeks_paid}', to_jsonb(v_weeks_paid));
    v_meta := jsonb_set(v_meta, '{last_payment_date}', to_jsonb(now()));
    
    UPDATE user_plans 
    SET 
        current_balance = v_new_balance,
        plan_metadata = v_meta,
        status = 'active', 
        start_date = COALESCE(start_date, now()),
        updated_at = now()
    WHERE id = v_user_plan.id;

    -- Record Deposit Transaction (Net)
    INSERT INTO transactions (
        user_id, plan_id, amount, type, description, reference, status
    ) VALUES (
        p_user_id, v_user_plan.plan_id, v_net_amount, 'deposit', 
        'Weekly Contribution (Week ' || v_weeks_paid || ')', 
        'MAR-' || floor(extract(epoch from now())), 'completed'
    );
    
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
DROP FUNCTION IF EXISTS trigger_marathon_auto_save();
CREATE OR REPLACE FUNCTION trigger_marathon_auto_save()
RETURNS TABLE (
    user_id UUID,
    user_full_name TEXT,
    amount_needed NUMERIC,
    status TEXT
) AS $$
DECLARE
    r RECORD;
    wallet_bal NUMERIC;
    weeks_elapsed INT;
    weeks_paid INT;
    min_amount NUMERIC := 3000; -- Default min
    v_full_name TEXT;
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
            SELECT profiles.full_name INTO v_full_name FROM profiles WHERE id = r.user_id;

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
            WHERE transactions.user_id = r.user_id AND plan_id IS NULL;

            IF wallet_bal >= min_amount THEN
                -- Deduct from Wallet
                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (r.user_id, min_amount, 'transfer', 'completed', 'Auto-Save for Marathon', NULL, 0);

                -- Credit Marathon via RPC (USE user_plan_id)
                PERFORM process_marathon_deposit(r.user_id, r.user_plan_id, min_amount);

                user_id := r.user_id;
                user_full_name := v_full_name;
                amount_needed := min_amount;
                status := 'Covered';
                RETURN NEXT;
            ELSE
                 user_id := r.user_id;
                 user_full_name := v_full_name;
                 amount_needed := min_amount;
                 status := 'Insufficient Funds';
                 RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
