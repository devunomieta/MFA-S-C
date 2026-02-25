-- DAILY DROP LOGIC

-- 1. Helper: Process Deposit for Daily Drop
-- Handles: 1st Payment Fee, Bulk/Advance Calculations
CREATE OR REPLACE FUNCTION process_daily_drop_deposit(
    p_user_id UUID,
    p_plan_id UUID,
    p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_user_plan RECORD;
    v_plan RECORD;
    v_meta JSONB;
    v_fixed_amount NUMERIC;
    v_days_paid_total INT;
    v_days_advanced INT;
    v_fee NUMERIC := 0;
    v_net_amount NUMERIC;
    v_new_balance NUMERIC;
    v_selected_duration INT;
BEGIN
    -- Get User Plan
    SELECT * INTO v_user_plan FROM user_plans 
    WHERE id = p_plan_id AND user_id = p_user_id AND status IN ('active', 'pending_activation');
    
    IF NOT FOUND THEN RAISE EXCEPTION 'Active or Pending Daily Drop plan not found for user'; END IF;

    -- Get Plan Details (Template)
    SELECT * INTO v_plan FROM plans WHERE id = v_user_plan.plan_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
    
    v_meta := v_user_plan.plan_metadata;
    v_days_paid_total := COALESCE((v_meta->>'total_days_paid')::INT, 0);
    v_selected_duration := COALESCE((v_meta->>'selected_duration')::INT, 31);
    v_fixed_amount := (v_meta->>'fixed_amount')::NUMERIC;
    
    IF v_fixed_amount IS NULL OR v_fixed_amount = 0 THEN
        RAISE EXCEPTION 'Invalid plan configuration: Fixed Amount not set.';
    END IF;

    -- Charge Logic
    -- Rule: "The selected fixed amount is automatically the charge and it's charged monthly."
    -- We track last_fee_date in metadata.
    
    DECLARE
        v_last_fee_date TIMESTAMPTZ;
    BEGIN
        v_last_fee_date := (v_meta->>'last_fee_date')::TIMESTAMPTZ;
        
        IF v_last_fee_date IS NULL OR v_last_fee_date <= (now() - INTERVAL '1 month') THEN
            v_fee := v_fixed_amount;
            v_meta := jsonb_set(v_meta, '{last_fee_date}', to_jsonb(now()));
            
            IF p_amount < v_fee THEN
                 RAISE EXCEPTION 'This deposit must cover the Monthly Service Charge (%s)', v_fee;
            END IF;
        END IF;
    END;

    v_net_amount := p_amount - v_fee;
    
    -- Calculate Days Advanced derived from the Net Amount
    -- If user pays 7000, and fixed is 1000. Fee is 0 (if not first). Days = 7.
    -- If first payment: Pay 7000. Fee 1000. Net 6000. Days = 6.
    
    v_days_advanced := floor(v_net_amount / v_fixed_amount);
    
    -- Update Balance
    v_new_balance := v_user_plan.current_balance + v_net_amount;
    
    -- Update Metadata
    v_days_paid_total := floor(v_new_balance / v_fixed_amount);
    
    IF v_selected_duration > 0 THEN
        IF v_days_paid_total >= v_selected_duration THEN
            v_days_paid_total := v_selected_duration;
        END IF;
    END IF;
    
    v_meta := jsonb_set(v_meta, '{total_days_paid}', to_jsonb(v_days_paid_total));
    v_meta := jsonb_set(v_meta, '{last_payment_date}', to_jsonb(now())); -- Important for Auto-Save
    
    UPDATE user_plans 
    SET 
        status = 'active',
        start_date = COALESCE(start_date, now()),
        current_balance = v_new_balance,
        plan_metadata = v_meta,
        updated_at = now()
    WHERE id = v_user_plan.id;

    -- Record Transactions
    INSERT INTO transactions (
        user_id, plan_id, amount, type, description, reference, status
    ) VALUES (
        p_user_id, v_user_plan.plan_id, p_amount, 'deposit', 
        'Daily Drop: ' || v_days_advanced || ' Days Advanced', 
        'DROP-' || floor(extract(epoch from now())), 
        'completed'
    );

    IF v_fee > 0 THEN
         INSERT INTO transactions (
            user_id, plan_id, amount, type, description, status
        ) VALUES (
            p_user_id, v_user_plan.plan_id, v_fee, 'fee', 
            'Service Charge (First Payment)', 
            'completed'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'days_advanced', v_days_advanced,
        'fee_charged', v_fee
    );
END;
$$ LANGUAGE plpgsql;


-- 2. Daily Auto-Save Trigger
-- Checks if user has paid for "Today".
-- Logic: If last_payment_date < Today (beginning of day), then they haven't paid today.
-- OR: We assume "Daily" means simply they must increment their day count every 24h.
-- "Deposit must be made daily before 11:59PM - if no deposit, general wallet will auto debit".
CREATE OR REPLACE FUNCTION trigger_daily_drop_auto_save()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    amount_deducted NUMERIC,
    status TEXT
) AS $$
DECLARE
    r RECORD;
    v_fixed_amount NUMERIC;
    v_last_payment TIMESTAMPTZ;
    v_wallet_bal NUMERIC;
    p_profile RECORD;
BEGIN
    FOR r IN
        SELECT 
            up.id as user_plan_id, 
            up.user_id, 
            up.plan_id,
            up.plan_metadata,
            up.updated_at
        FROM user_plans up
        JOIN plans p ON up.plan_id = p.id
        WHERE p.type = 'daily_drop' AND up.status = 'active'
    LOOP
        v_fixed_amount := (r.plan_metadata->>'fixed_amount')::NUMERIC;
        v_last_payment := (r.plan_metadata->>'last_payment_date')::TIMESTAMPTZ;
        
        -- If Last Payment was BEFORE Today (i.e., Yesterday or earlier)
        -- AND it is currently past 23:58 (or we assume this job triggers at 23:59 or next day 00:01)
        -- Simplifying: If they haven't made a payment strictly TODAY.
        
        IF v_last_payment IS NULL OR v_last_payment < current_date THEN
             -- Attempt Debit
             
             -- Get Profile
             SELECT full_name INTO p_profile FROM profiles WHERE id = r.user_id;
             
              -- Check Wallet
            SELECT COALESCE(SUM(
                CASE
                    WHEN type IN ('deposit', 'loan_disbursement', 'limit_transfer') AND status = 'completed' THEN amount
                    WHEN type IN ('withdrawal', 'loan_repayment') AND status IN ('completed', 'pending') THEN -amount - COALESCE(charge, 0)
                    WHEN type = 'transfer' AND status = 'completed' THEN -amount - COALESCE(charge, 0) 
                    ELSE 0
                END
            ), 0) INTO v_wallet_bal
            FROM transactions
            WHERE user_id = r.user_id AND plan_id IS NULL;
            
            IF v_wallet_bal >= v_fixed_amount THEN
                -- Debit Wallet
                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (r.user_id, v_fixed_amount, 'transfer', 'completed', 'Auto-Drop from Wallet', NULL, 0);
                
                -- Credit Plan
                PERFORM process_daily_drop_deposit(r.user_id, r.plan_id, v_fixed_amount);
                
                user_id := r.user_id;
                full_name := p_profile.full_name;
                amount_deducted := v_fixed_amount;
                status := 'Covered';
                RETURN NEXT;
            ELSE
                 user_id := r.user_id;
                 full_name := p_profile.full_name;
                 amount_deducted := v_fixed_amount;
                 status := 'Insufficient Funds';
                 RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Withdrawal Logic for Daily Drop
-- Transfers current_balance to Withdrawable Wallet upon reaching target.
CREATE OR REPLACE FUNCTION withdraw_daily_drop_payout(
    p_user_id UUID,
    p_user_plan_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_user_plan RECORD;
    v_amount NUMERIC;
    v_meta JSONB;
    v_target_plan_id UUID;
BEGIN
    -- Get User Plan
    SELECT * INTO v_user_plan FROM user_plans 
    WHERE id = p_user_plan_id AND user_id = p_user_id AND status = 'active';
    
    IF NOT FOUND THEN RAISE EXCEPTION 'Active Daily Drop plan not found for user'; END IF;

    -- Find Withdrawable Wallet Plan ID
    SELECT id INTO v_target_plan_id FROM plans WHERE type = 'withdrawable_wallet' LIMIT 1;
    IF v_target_plan_id IS NULL THEN RAISE EXCEPTION 'Withdrawable Wallet plan type not found'; END IF;

    v_meta := v_user_plan.plan_metadata;
    v_amount := v_user_plan.current_balance;

    IF v_amount <= 0 THEN
        RAISE EXCEPTION 'No funds available to withdraw.';
    END IF;

    -- Update User Plan: set withdrawn = true and store amount in metadata
    v_meta := jsonb_set(v_meta, '{withdrawn}', 'true'::jsonb);
    v_meta := jsonb_set(v_meta, '{withdrawn_amount}', to_jsonb(v_amount));

    UPDATE user_plans 
    SET 
        current_balance = 0,
        plan_metadata = v_meta,
        updated_at = now()
    WHERE id = v_user_plan.id;

    -- Deduct funds from plan
    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, v_user_plan.plan_id, v_amount, 'withdrawal', 'completed', 'Goal Payout to Withdrawable Wallet', 0);

    -- Credit Withdrawable Wallet (Virtual Plan)
    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, v_target_plan_id, v_amount, 'transfer', 'completed', 'Daily Drop Payout Received', 0);

    RETURN jsonb_build_object(
        'success', true,
        'amount_withdrawn', v_amount
    );
END;
$$ LANGUAGE plpgsql;
