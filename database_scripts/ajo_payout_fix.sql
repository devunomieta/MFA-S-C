
-- Migration: Fix Ajo Payout Distribution and Balance Visibility

-- 1. Update transaction types to include 'payout'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
    'deposit', 
    'withdrawal', 
    'loan_disbursement', 
    'loan_repayment', 
    'interest', 
    'transfer', 
    'fee', 
    'service_charge',
    'limit_transfer',
    'payout'
));

-- 2. Seed the Withdrawable Wallet plan if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM plans WHERE type = 'withdrawable_wallet') THEN
        INSERT INTO plans (name, description, service_charge, duration_weeks, duration_months, min_amount, type, is_active, contribution_type, config)
        VALUES (
            'Withdrawable Wallet',
            'Receives all Ajo payouts, Approved Loans, and Matured Savings. Ready for bank withdrawal.',
            0,
            1,
            1,
            0,
            'withdrawable_wallet',
            false,
            'fixed',
            '{}'::jsonb
        );
    ELSE
        UPDATE plans 
        SET name = 'Withdrawable Wallet',
            description = 'Receives all Ajo payouts, Approved Loans, and Matured Savings. Ready for bank withdrawal.',
            type = 'withdrawable_wallet'
        WHERE type = 'ajo_payout';
    END IF;
END $$;

-- 3. Refactor withdraw_ajo_payout RPC
CREATE OR REPLACE FUNCTION withdraw_ajo_payout(
    p_user_id UUID,
    p_plan_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_plan RECORD;
    v_target_plan_id UUID;
    v_target_user_plan_id UUID;
    v_metadata JSONB;
    v_current_week INTEGER;
    v_picking_turns INT[];
    v_payout_history JSONB;
    v_fixed_amount NUMERIC;
    v_duration_weeks INTEGER;
    v_payout_amount NUMERIC;
    v_turn_count INTEGER;
    v_history_count INTEGER;
    v_is_my_turn BOOLEAN := false;
BEGIN
    -- Get User Plan
    SELECT * INTO v_user_plan 
    FROM user_plans 
    WHERE user_id = p_user_id AND plan_id = p_plan_id AND status = 'active';

    IF NOT FOUND THEN RAISE EXCEPTION 'Active Ajo Circle plan not found'; END IF;

    v_metadata := v_user_plan.plan_metadata;
    v_current_week := COALESCE((v_metadata->>'current_week')::INTEGER, 1);
    v_fixed_amount := (v_metadata->>'fixed_amount')::NUMERIC;
    v_duration_weeks := COALESCE((v_metadata->>'duration_weeks')::INTEGER, 10);
    v_payout_amount := v_fixed_amount * v_duration_weeks;
    
    -- Convert picking_turns to array for check and count Occurrences
    SELECT ARRAY(SELECT jsonb_array_elements_text(v_metadata->'picking_turns')::INT) INTO v_picking_turns;
    
    -- Count how many times current week appears in picking turns
    SELECT count(*) INTO v_turn_count 
    FROM unnest(v_picking_turns) t 
    WHERE t = v_current_week;

    IF v_turn_count = 0 THEN
        RAISE EXCEPTION 'It is not your turn to withdraw (Your weeks: %, Current week: %)', v_picking_turns, v_current_week;
    END IF;

    -- Check how many times already withdrawn for this week
    v_payout_history := COALESCE(v_metadata->'payout_history', '[]'::jsonb);
    SELECT count(*) INTO v_history_count 
    FROM jsonb_array_elements_text(v_payout_history) h 
    WHERE h = v_current_week::TEXT;

    IF v_history_count >= v_turn_count THEN
        RAISE EXCEPTION 'Payout for week % already withdrawn (% times)', v_current_week, v_history_count;
    END IF;

    -- 1. Identify Target "Withdrawable" Payout Plan
    SELECT id INTO v_target_plan_id FROM plans WHERE type = 'withdrawable_wallet' LIMIT 1;
    IF v_target_plan_id IS NULL THEN RAISE EXCEPTION 'Target Withdrawable Wallet not configured'; END IF;

    -- Get or Create the User's Payout Plan record
    SELECT id INTO v_target_user_plan_id FROM user_plans 
    WHERE user_id = p_user_id AND plan_id = v_target_plan_id LIMIT 1;

    IF v_target_user_plan_id IS NULL THEN
        INSERT INTO user_plans (user_id, plan_id, current_balance, status, start_date)
        VALUES (p_user_id, v_target_plan_id, 0, 'matured', NOW())
        RETURNING id INTO v_target_user_plan_id;
    END IF;

    -- 2. Fund Transfer Logic
    -- Deduct from Ajo Plan (it has served its purpose for this payout)
    UPDATE user_plans 
    SET current_balance = current_balance - v_payout_amount,
        plan_metadata = jsonb_set(
            v_metadata, 
            '{payout_history}', 
            v_payout_history || jsonb_build_array(v_current_week::TEXT) -- Store as string for consistency
        ),
        updated_at = NOW()
    WHERE id = v_user_plan.id;

    -- Credit Payout Plan (Set to matured status ensuring visibility in Withdrawable Balance)
    UPDATE user_plans
    SET current_balance = current_balance + v_payout_amount,
        status = 'matured', -- Force matured status
        updated_at = NOW()
    WHERE id = v_target_user_plan_id;

    -- 3. Record Transactions
    -- Debit Ajo Plan
    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, p_plan_id, v_payout_amount, 'withdrawal', 'completed', 'Ajo Payout Distributed', 0);

    -- Credit Payout Plan (As 'payout' type)
    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, v_target_plan_id, v_payout_amount, 'payout', 'completed', 'Ajo Circle Payout Received', 0);

    -- 4. Notification
    INSERT INTO notifications (user_id, type, title, message, is_read)
    VALUES (
        p_user_id, 
        'transaction', 
        'Ajo Payout Received!', 
        'Your payout of ₦' || v_payout_amount || ' for week ' || v_current_week || ' is now available in your withdrawable wallet.',
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'amount', v_payout_amount,
        'week', v_current_week
    );
END;
$$;
