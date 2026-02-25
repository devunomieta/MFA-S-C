-- Logic for "The Sprint" Plan

-- 1. Helper to Calculate Logic
CREATE OR REPLACE FUNCTION calculate_sprint_fee(
    p_amount NUMERIC,
    p_tier_config JSONB
) RETURNS NUMERIC AS $$
DECLARE
    v_tier JSONB;
BEGIN
    FOR v_tier IN SELECT * FROM jsonb_array_elements(p_tier_config)
    LOOP
        IF p_amount >= (v_tier->>'min')::NUMERIC AND p_amount <= (v_tier->>'max')::NUMERIC THEN
            RETURN (v_tier->>'fee')::NUMERIC;
        END IF;
    END LOOP;
    -- Default fallback if above max range (though last tier should cover it)
    RETURN 500; 
END;
$$ LANGUAGE plpgsql;

-- 2. Process Sprint Deposit (RPC)
-- Called when user transfers to sprint plan
CREATE OR REPLACE FUNCTION process_sprint_deposit(
    p_user_id UUID,
    p_plan_id UUID,
    p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_user_plan RECORD;
    v_meta JSONB;
    v_week_total NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Get User Plan
    SELECT * INTO v_user_plan FROM user_plans 
    WHERE id = p_plan_id AND user_id = p_user_id AND status IN ('active', 'pending_activation');
    
    IF NOT FOUND THEN RAISE EXCEPTION 'Active or Pending Sprint plan not found for user'; END IF;

    v_meta := v_user_plan.plan_metadata;
    
    -- [NEW] Spread Logic
    DECLARE
        v_total_available NUMERIC;
        v_weeks_to_advance INT;
        v_remainder NUMERIC;
        v_weeks_done INT;
        v_target_amount NUMERIC;
        v_selected_duration INT;
    BEGIN
        v_target_amount := COALESCE((v_meta->>'target_amount')::NUMERIC, 3000);
        v_selected_duration := COALESCE((v_meta->>'selected_duration')::INT, 12);
        v_weeks_done := COALESCE((v_meta->>'weeks_completed')::INT, 0);
        v_total_available := COALESCE((v_meta->>'current_week_total')::NUMERIC, 0) + p_amount;
        
        v_weeks_to_advance := FLOOR(v_total_available / v_target_amount)::INT;

        IF (v_weeks_done + v_weeks_to_advance) >= v_selected_duration THEN
            v_week_total := v_total_available - ((v_selected_duration - v_weeks_done) * v_target_amount);
            v_weeks_done := v_selected_duration;
        ELSE
            v_weeks_done := v_weeks_done + v_weeks_to_advance;
            v_week_total := v_total_available % v_target_amount;
        END IF;

        v_meta := jsonb_set(v_meta, '{current_week_total}', to_jsonb(v_week_total));
        v_meta := jsonb_set(v_meta, '{weeks_completed}', to_jsonb(v_weeks_done));
    END;
    
    v_new_balance := v_user_plan.current_balance + p_amount;
    v_meta := jsonb_set(v_meta, '{last_deposit_date}', to_jsonb(now()));

    UPDATE user_plans 
    SET 
        current_balance = v_new_balance,
        plan_metadata = v_meta,
        status = 'active',
        start_date = COALESCE(start_date, now()),
        updated_at = now()
    WHERE id = v_user_plan.id;

    -- Record Transaction
    INSERT INTO transactions (
        user_id, plan_id, amount, type, description, reference, status
    ) VALUES (
        p_user_id, v_user_plan.plan_id, p_amount, 'deposit', 
        'Sprint Contribution', 'SPR-' || floor(extract(epoch from now())), 'completed'
    );

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'week_total', v_week_total);
END;
$$ LANGUAGE plpgsql;


-- 3. Weekly Settlement Logic (Called by Cron/Admin)
-- This assumes it runs for a specific user plan or iterates all.
-- For simplicity, let's make it per-user-plan so the Cron loop can call it.
CREATE OR REPLACE FUNCTION settle_sprint_week(p_user_plan_id UUID) RETURNS JSONB AS $$
DECLARE
    v_up RECORD;
    v_plan RECORD;
    v_meta JSONB;
    v_week_total NUMERIC;
    v_fee NUMERIC := 0;
    v_penalty NUMERIC := 0;
    v_new_balance NUMERIC;
    v_arrears NUMERIC := 0;
    v_weeks_done INT;
BEGIN
    SELECT * INTO v_up FROM user_plans WHERE id = p_user_plan_id;
    SELECT * INTO v_plan FROM plans WHERE id = v_up.plan_id;
    
    v_meta := v_up.plan_metadata;
    v_week_total := COALESCE((v_meta->>'current_week_total')::NUMERIC, 0);
    v_new_balance := v_up.current_balance;
    v_weeks_done := COALESCE((v_meta->>'weeks_completed')::INT, 0);
    v_arrears := COALESCE((v_meta->>'arrears_amount')::NUMERIC, 0);

    -- [NEW] Advance Payment Check
    -- If weeks_completed is already ahead of schedule, we don't need to penalize or requirement check.
    -- Schedule check: weeks_elapsed = floor(now - start_date)
    DECLARE
        v_weeks_elapsed INT;
    BEGIN
        v_weeks_elapsed := FLOOR(EXTRACT(EPOCH FROM (NOW() - v_up.start_date)) / 604800)::INT;
        
        -- If user has already paid for more weeks than have elapsed...
        IF v_weeks_done > v_weeks_elapsed THEN
            -- Skip settlement (or just increment week if needed? No, week is already advanced).
            -- Actually, settlement resets the week's total, so we should still do that but skip penalty.
            v_meta := jsonb_set(v_meta, '{current_week_total}', '0');
            v_meta := jsonb_set(v_meta, '{last_settlement_date}', to_jsonb(now()));
            
            UPDATE user_plans SET plan_metadata = v_meta WHERE id = v_up.id;
            RETURN jsonb_build_object('success', true, 'status', 'prepaid_skip');
        END IF;
    END;

    IF v_week_total >= 3000 THEN
        -- Target Met: Deduct Fee
        v_fee := calculate_sprint_fee(v_week_total, v_plan.config->'tiers');
        v_new_balance := v_new_balance - v_fee;
        
        IF v_fee > 0 THEN
             INSERT INTO transactions (user_id, plan_id, amount, type, description, status)
             VALUES (v_up.user_id, v_up.plan_id, v_fee, 'fee', 'Weekly Service Charge', 'completed');
        END IF;

    ELSE
        -- Target Missed: Deduct Penalty & Add to Arrears
        v_penalty := (v_plan.config->>'penalty_amount')::NUMERIC;
        v_new_balance := v_new_balance - v_penalty; -- Can go negative or eat into savings? "Deducted from already saved balance"
        
        -- Add 3000 to arrears
        v_arrears := v_arrears + 3000;

        INSERT INTO transactions (user_id, plan_id, amount, type, description, status)
        VALUES (v_up.user_id, v_up.plan_id, v_penalty, 'fee', 'Missed Week Penalty', 'completed');
    END IF;

    -- Reset Week
    v_weeks_done := v_weeks_done + 1;
    v_meta := jsonb_set(v_meta, '{current_week_total}', '0');
    v_meta := jsonb_set(v_meta, '{weeks_completed}', to_jsonb(v_weeks_done));
    v_meta := jsonb_set(v_meta, '{arrears_amount}', to_jsonb(v_arrears));
    v_meta := jsonb_set(v_meta, '{last_settlement_date}', to_jsonb(now()));

    UPDATE user_plans 
    SET current_balance = v_new_balance, plan_metadata = v_meta
    WHERE id = v_up.id;

    RETURN jsonb_build_object('success', true, 'fee', v_fee, 'penalty', v_penalty, 'arrears', v_arrears);
END;
$$ LANGUAGE plpgsql;


-- 4. Auto-Recovery Trigger Function
CREATE OR REPLACE FUNCTION trigger_sprint_recovery() RETURNS TRIGGER AS $$
DECLARE
    v_sprint_plan RECORD;
    v_sprint_user_plan RECORD;
    v_arrears NUMERIC;
    v_recovery_amt NUMERIC;
    v_wallet_bal NUMERIC; 
BEGIN
    -- Only run on Deposit to General Wallet (plan_id is NULL)
    IF NEW.plan_id IS NOT NULL OR NEW.type != 'deposit' OR NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;

    -- Find active Sprint plan for this user with arrears
    SELECT p.id as plan_id, up.id as user_plan_id, up.plan_metadata, up.current_balance
    INTO v_sprint_user_plan
    FROM user_plans up
    JOIN plans p ON up.plan_id = p.id
    WHERE up.user_id = NEW.user_id 
      AND p.type = 'sprint' 
      AND up.status = 'active'
      AND (up.plan_metadata->>'arrears_amount')::NUMERIC > 0
    LIMIT 1;

    IF FOUND THEN
        v_arrears := (v_sprint_user_plan.plan_metadata->>'arrears_amount')::NUMERIC;
        
        -- How much to recover? Min(Arrears, General Wallet Deposit Amount)
        -- Actually, prompt says "deducted immediately there is a top up". 
        -- If I top up 10k, and owe 3k, take 3k.
        -- If I top up 1k, and owe 3k, take 1k? Or strict 3k?
        -- Prompt: "deducting 3000... immediately there is a top up". 
        -- Assumes top up covers it? If not, partial? Let's do partial or full based on available.
        -- We must check current GENERAL WALLET balance (which includes this NEW deposit).
        
        -- Logic: We just inserted the deposit. So balance should be sufficient if it was calculated correctly elsewhere.
        -- But for simplicity, let's just use the NEW.amount as the "available to grab" cap, 
        -- assuming they might have other funds too, but let's be safe.
        
        v_recovery_amt := LEAST(v_arrears, NEW.amount); -- Only take what just came in? Or check full balance?
        -- Let's take up to arrears amount if general wallet has it.
        -- Calculating general wallet is expensive. Let's trust NEW.amount for now effectively "intercepting" the top up.
        
        IF v_recovery_amt > 0 THEN
            -- 1. Create Transfer OUT of General
            INSERT INTO transactions (user_id, plan_id, amount, type, description, status)
            VALUES (NEW.user_id, NULL, v_recovery_amt, 'transfer', 'Auto-Recovery for Sprint Arrears', 'completed');

            -- 2. Create Transfer INTO Sprint
            INSERT INTO transactions (user_id, plan_id, amount, type, description, status)
            VALUES (NEW.user_id, v_sprint_user_plan.plan_id, v_recovery_amt, 'transfer', 'Auto-Recovery from Wallet', 'completed');

            -- 3. Update Sprint Balance & Reduce Arrears
            UPDATE user_plans
            SET 
                current_balance = current_balance + v_recovery_amt,
                plan_metadata = jsonb_set(
                    plan_metadata, 
                    '{arrears_amount}', 
                    to_jsonb(v_arrears - v_recovery_amt)
                )
            WHERE id = v_sprint_user_plan.user_plan_id;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger
DROP TRIGGER IF EXISTS trg_sprint_recovery ON transactions;
CREATE TRIGGER trg_sprint_recovery
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_sprint_recovery();
