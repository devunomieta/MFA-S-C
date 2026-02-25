-- Logic for "The Anchor" (48 Weeks)

-- 1. Helper: Calculate Fee based on Tiers
CREATE OR REPLACE FUNCTION calculate_anchor_fee(amount DECIMAL) 
RETURNS DECIMAL AS $$
BEGIN
    IF amount >= 3000 AND amount <= 14000 THEN
        RETURN 200;
    ELSIF amount >= 14500 AND amount <= 23000 THEN
        RETURN 300;
    ELSIF amount >= 23500 THEN
        RETURN 500;
    ELSE
        RETURN 0; -- Below minimum or invalid ranges (though min is enforced elsewhere)
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Process Anchor Deposit (Called via RPC)
CREATE OR REPLACE FUNCTION process_anchor_deposit(p_user_id UUID, p_plan_id UUID, p_amount DECIMAL)
RETURNS JSONB AS $$
DECLARE
    v_plan_metadata JSONB;
    v_current_balance DECIMAL;
    v_weeks_completed INT;
    v_current_week_total DECIMAL;
    v_new_total DECIMAL;
    v_plan_status TEXT;
    v_template_id UUID;
BEGIN
    -- Get current state
    -- We assume p_plan_id is the primary key of user_plans
    SELECT plan_metadata, current_balance, status, plan_id
    INTO v_plan_metadata, v_current_balance, v_plan_status, v_template_id
    FROM user_plans 
    WHERE id = p_plan_id AND user_id = p_user_id;
    
    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'Active or Pending Anchor plan not found for user';
    END IF;

    -- Initialize if null
    IF v_plan_metadata IS NULL THEN
        v_plan_metadata := '{}'::jsonb;
    END IF;

    v_weeks_completed := COALESCE((v_plan_metadata->>'weeks_completed')::INT, 0);
    v_current_week_total := COALESCE((v_plan_metadata->>'current_week_total')::DECIMAL, 0);

    -- Activate if pending
    IF v_plan_status = 'pending_activation' THEN
        UPDATE user_plans SET status = 'active', start_date = NOW() 
        WHERE id = p_plan_id;
    END IF;

    -- [NEW] Spread Logic
    DECLARE
        v_total_available DECIMAL;
        v_weeks_to_advance INT;
        v_remainder DECIMAL;
        v_target_amount DECIMAL;
    BEGIN
        v_target_amount := COALESCE((v_plan_metadata->>'target_amount')::DECIMAL, 3000);
        v_total_available := v_current_week_total + p_amount;
        v_weeks_to_advance := FLOOR(v_total_available / v_target_amount)::INT;
        
        IF (v_weeks_completed + v_weeks_to_advance) >= 48 THEN
            v_new_total := v_total_available - ((48 - v_weeks_completed) * v_target_amount);
            v_weeks_completed := 48;
        ELSE
            v_weeks_completed := v_weeks_completed + v_weeks_to_advance;
            v_new_total := v_total_available % v_target_amount;
        END IF;
    END;

    -- Update Plan
    UPDATE user_plans
    SET 
        current_balance = current_balance + p_amount,
        plan_metadata = jsonb_set(
            jsonb_set(
                jsonb_set(v_plan_metadata, '{current_week_total}', to_jsonb(v_new_total)),
                '{weeks_completed}', to_jsonb(v_weeks_completed)
            ),
            '{last_activity}', to_jsonb(NOW())
        ),
        updated_at = NOW()
    WHERE id = p_plan_id;
    
    -- Log Deposit Transaction
    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, v_template_id, p_amount, 'deposit', 'completed', 'Anchor Deposit', 0);

    RETURN jsonb_build_object(
        'success', true, 
        'week_total', v_new_total,
        'weeks_completed', v_weeks_completed
    );
END;
$$ LANGUAGE plpgsql;


-- 3. Weekly Settlement Logic (Sunday 11:59PM)
CREATE OR REPLACE FUNCTION settle_anchor_week(p_user_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
    r RECORD;
    v_fee DECIMAL;
    v_penalty DECIMAL := 500;
    v_weeks_completed INT;
    v_current_week_total DECIMAL;
    v_new_balance DECIMAL;
    v_arrears DECIMAL;
BEGIN
    SELECT * INTO r FROM user_plans WHERE id = p_user_plan_id;
    
    v_weeks_completed := COALESCE((r.plan_metadata->>'weeks_completed')::INT, 0);
    v_current_week_total := COALESCE((r.plan_metadata->>'current_week_total')::DECIMAL, 0);
    v_arrears := COALESCE((r.plan_metadata->>'arrears_amount')::DECIMAL, 0);

    -- Logic:
    -- If total >= 3000: Goal Met. Deduct Fee. Increment Week.
    -- If total < 3000: Goal Missed. Deduct Penalty (500) from balance. Add Penalty to Arrears? 
    -- Requirement: "Fee of 500 is to be deducted... from the already saved balance. The account should be kept on auto debit... deducting 3k without charge"
    -- Interpretation: If missed, user pays nothing now. But Balance reduces by 500 (Real Loss). And next time they pay, we take 3k for this missed week? Or just arrears?
    -- "Auto debit... deducting 3k... immediately there is a top up" implies Arrears = 3000 (the principal missed) + maybe the penalty?
    -- Actually request says: "deducting 3k without the usual charge".
    -- So:
    -- 1. Deduct 500 Penalty from Balance.
    -- 2. Add 3000 to Arrears (To be recovered).
    -- 3. Week NOT incremented? Or Incremented? Usually in fixed duration, week increments even if missed. Let's increment.

    -- [NEW] Advance Payment Check
    DECLARE
        v_weeks_elapsed INT;
    BEGIN
        v_weeks_elapsed := FLOOR(EXTRACT(EPOCH FROM (NOW() - r.start_date)) / 604800)::INT;
        
        IF v_weeks_completed > v_weeks_elapsed THEN
            UPDATE user_plans
            SET plan_metadata = plan_metadata || jsonb_build_object(
                'current_week_total', 0,
                'last_settlement_date', NOW()
            )
            WHERE id = p_user_plan_id;
            
            RETURN jsonb_build_object('status', 'success', 'context', 'prepaid_skip');
        END IF;
    END;

    IF v_current_week_total >= 3000 THEN
        -- Success Case
        v_fee := calculate_anchor_fee(v_current_week_total);
        
        UPDATE user_plans
        SET 
            current_balance = current_balance - v_fee, -- Charge deducted from balance
            plan_metadata = plan_metadata || jsonb_build_object(
                'weeks_completed', v_weeks_completed + 1,
                'current_week_total', 0,
                'last_settlement_date', NOW()
            )
        WHERE id = p_user_plan_id;

        -- Log Fee
        INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
        VALUES (r.user_id, r.plan_id, v_fee, 'charge', 'completed', 'Weekly Service Charge (Anchor)', 0);
        
        RETURN jsonb_build_object('status', 'success', 'fee', v_fee);

    ELSE
        -- Failure Case
        -- Deduct Penalty from Balance
        UPDATE user_plans
        SET 
            current_balance = current_balance - v_penalty,
            plan_metadata = plan_metadata || jsonb_build_object(
                'weeks_completed', v_weeks_completed + 1, -- We move on, strict time
                'current_week_total', 0,
                'arrears_amount', v_arrears + 3000, -- Monitor this to recover 3k later
                'last_settlement_date', NOW()
            )
        WHERE id = p_user_plan_id;

        INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
        VALUES (r.user_id, r.plan_id, v_penalty, 'penalty', 'completed', 'Missed Week Penalty (Anchor)', 0);

        RETURN jsonb_build_object('status', 'missed', 'penalty', v_penalty);
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 4. Auto-Recovery Trigger on Deposit (Recover Arrears)
CREATE OR REPLACE FUNCTION trigger_anchor_recovery()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    v_arrears DECIMAL;
    v_recovery_amount DECIMAL;
BEGIN
    -- Check if user has Anchor plan with arrears
    SELECT * INTO r FROM user_plans 
    WHERE user_id = NEW.user_id 
    AND status = 'active'
    AND EXISTS (SELECT 1 FROM plans WHERE id = user_plans.plan_id AND type = 'anchor');

    IF FOUND THEN
        v_arrears := COALESCE((r.plan_metadata->>'arrears_amount')::DECIMAL, 0);
        
        IF v_arrears > 0 THEN
            -- Calculate what we can take
            -- taking from the NEW deposit? Or General Wallet?
            -- Context: "deducted immediately there is a top up to the general wallet"
            
            -- If this transaction is a General Wallet Deposit (plan_id is null)
            IF NEW.plan_id IS NULL AND NEW.type = 'deposit' AND NEW.status = 'completed' THEN
                -- Insert Transfer from General -> Anchor
                v_recovery_amount := LEAST(NEW.amount, v_arrears);
                
                IF v_recovery_amount > 0 THEN
                     INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                     VALUES (NEW.user_id, v_recovery_amount, 'transfer', 'completed', 'Auto-Recovery Arrears (Anchor)', NULL, 0); -- Deduct from Wallet (plan_id null)

                     -- Update Anchor Plan (Add funds, reduce arrears)
                     UPDATE user_plans
                     SET 
                        current_balance = current_balance + v_recovery_amount,
                        plan_metadata = plan_metadata || jsonb_build_object(
                            'arrears_amount', v_arrears - v_recovery_amount
                        )
                     WHERE id = r.id;
                     
                     -- Log Credit to Anchor
                     INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                     VALUES (NEW.user_id, v_recovery_amount, 'deposit', 'completed', 'Auto-Recovery Arrears (Anchor)', r.plan_id, 0);
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Trigger
DROP TRIGGER IF EXISTS trg_anchor_recovery ON transactions;
CREATE TRIGGER trg_anchor_recovery
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_anchor_recovery();
