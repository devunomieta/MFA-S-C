-- Logic for "The Step-Up" Plan
-- Handles: Weekly Deposits, Tiered Charges, Settlements, and Arrears Recovery

-- 1. Process Step-Up Deposit
CREATE OR REPLACE FUNCTION process_step_up_deposit(
    p_user_id UUID,
    p_plan_id UUID,
    p_amount DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_plan_id UUID;
    v_plan_metadata JSONB;
    v_week_paid_so_far DECIMAL;
    v_weeks_to_advance INT;
    v_weeks_completed INT;
    v_total_available DECIMAL;
    v_target_amount DECIMAL;
    v_selected_duration INT;
    v_plan_template_id UUID;
    v_fee NUMERIC := 0;
    v_net_amount NUMERIC;
    v_last_fee_date TIMESTAMPTZ;
BEGIN
    -- Get User Plan
    SELECT id, plan_metadata, plan_id INTO v_user_plan_id, v_plan_metadata, v_plan_template_id
    FROM user_plans
    WHERE id = p_plan_id AND user_id = p_user_id AND status IN ('active', 'pending_activation');

    IF v_user_plan_id IS NULL THEN
        RAISE EXCEPTION 'Active or Pending Step-Up plan not found for user';
    END IF;

    v_last_fee_date := (v_plan_metadata->>'last_fee_date')::TIMESTAMPTZ;

    -- Charge Logic: Immediate deduction if due (Weekly)
    IF v_last_fee_date IS NULL OR v_last_fee_date <= (now() - INTERVAL '1 week') THEN
        v_fee := calculate_plan_service_charge(v_plan_template_id, p_amount);
        
        IF p_amount < v_fee THEN
            RAISE EXCEPTION 'This deposit must cover the Service Charge (%s)', v_fee;
        END IF;
        
        v_plan_metadata := jsonb_set(v_plan_metadata, '{last_fee_date}', to_jsonb(now()));
        
        -- Distribute Fee to Admin
        PERFORM distribute_service_charge(p_user_id, v_plan_template_id, v_fee, 'Step-Up Weekly Service Charge');
        
        -- Record Fee Transaction
        INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
        VALUES (p_user_id, v_plan_template_id, v_fee, 'fee', 'completed', 'Weekly Service Charge (Immediate)', 0);
    END IF;

    v_net_amount := p_amount - v_fee;

    v_target_amount := COALESCE((v_plan_metadata->>'fixed_amount')::DECIMAL, 5000);
    v_weeks_completed := COALESCE((v_plan_metadata->>'weeks_completed')::INT, 0);
    v_week_paid_so_far := COALESCE((v_plan_metadata->>'week_paid_so_far')::DECIMAL, 0);
    v_selected_duration := COALESCE((v_plan_metadata->>'selected_duration')::INT, 12);
    
    v_total_available := v_week_paid_so_far + v_net_amount;
    v_weeks_to_advance := FLOOR(v_total_available / v_target_amount)::INT;
    
    -- Implement Capping & Spread
    IF (v_weeks_completed + v_weeks_to_advance) >= v_selected_duration THEN
        v_week_paid_so_far := v_total_available - ((v_selected_duration - v_weeks_completed) * v_target_amount);
        v_weeks_completed := v_selected_duration;
    ELSE
        v_weeks_completed := v_weeks_completed + v_weeks_to_advance;
        v_week_paid_so_far := v_total_available % v_target_amount;
    END IF;

    -- Update user_plans
    UPDATE user_plans
    SET 
        status = 'active',
        start_date = COALESCE(start_date, NOW()),
        current_balance = current_balance + v_net_amount,
        plan_metadata = jsonb_set(
            jsonb_set(
                jsonb_set(
                    v_plan_metadata,
                    '{week_paid_so_far}',
                    to_jsonb(v_week_paid_so_far)
                ),
                '{weeks_completed}',
                to_jsonb(v_weeks_completed)
            ),
            '{last_deposit_date}',
            to_jsonb(NOW())
        ),
        updated_at = NOW()
    WHERE id = v_user_plan_id;

    -- Record Deposit Transaction (Net)
    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, v_plan_template_id, v_net_amount, 'deposit', 'completed', 'Step-Up Contribution', 0);
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Deposit processed. Week progress updated.',
        'week_paid', v_week_paid_so_far,
        'target', v_target_amount,
        'fee_charged', v_fee
    )::JSONB;
END;
$$;

-- 2. Trigger Auto-Save (Sunday 6am - 11:59pm)
-- This function is called by the Admin Button (or cron)
DROP FUNCTION IF EXISTS trigger_step_up_auto_save();
CREATE OR REPLACE FUNCTION trigger_step_up_auto_save()
RETURNS TABLE (
    user_id UUID,
    user_full_name TEXT,
    amount_deducted DECIMAL,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_plan_id UUID;
    v_balance DECIMAL;
    v_target DECIMAL;
    v_week_paid DECIMAL;
    v_deficit DECIMAL;
    v_full_name TEXT;
BEGIN
    -- Get Step-Up Plan ID
    SELECT id INTO v_plan_id FROM plans WHERE type = 'step_up' LIMIT 1;
    
    FOR r IN 
        SELECT up.id AS user_plan_id, up.user_id, up.plan_metadata 
        FROM user_plans up
        WHERE up.plan_id = v_plan_id AND up.status = 'active'
    LOOP
        v_target := (r.plan_metadata->>'fixed_amount')::DECIMAL;
        v_week_paid := COALESCE((r.plan_metadata->>'week_paid_so_far')::DECIMAL, 0);
        
        IF v_week_paid < v_target THEN
            v_deficit := v_target - v_week_paid;
            
            -- Get Profile Name
            SELECT profiles.full_name INTO v_full_name FROM profiles WHERE id = r.user_id;

            -- Check General Wallet Balance using centralized logic
            v_balance := get_wallet_balance(r.user_id, NULL);
            
            IF v_balance >= v_deficit THEN
                -- Deduct from Wallet
                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (r.user_id, v_deficit, 'transfer', 'completed', 'Auto-Save for Step-Up Week', NULL, 0);

                -- Credit Step-Up (USE user_plan_id)
                PERFORM process_step_up_deposit(r.user_id, r.user_plan_id, v_deficit);
                
                user_id := r.user_id;
                user_full_name := v_full_name;
                status := 'Covered';
                amount_deducted := v_deficit;
                RETURN NEXT;
            ELSE
                 -- Log failed attempt
                 user_id := r.user_id;
                 user_full_name := v_full_name;
                 status := 'Insufficient Funds';
                 amount_deducted := 0;
                 RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 3. Settle Week (Sunday 11:59PM)
-- Deducts Charges, Resets Week Counter, Applies Penalties
CREATE OR REPLACE FUNCTION settle_step_up_week()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_plan_id UUID;
    v_target DECIMAL;
    v_week_paid DECIMAL;
    v_charge DECIMAL;
    v_penalty DECIMAL := 500;
    v_arrears DECIMAL;
BEGIN
    SELECT id INTO v_plan_id FROM plans WHERE type = 'step_up' LIMIT 1;

    FOR r IN 
        SELECT up.id, up.user_id, up.plan_metadata, up.current_balance 
        FROM user_plans up
        WHERE up.plan_id = v_plan_id AND up.status = 'active'
    LOOP
        v_target := (r.plan_metadata->>'fixed_amount')::DECIMAL;
        v_week_paid := COALESCE((r.plan_metadata->>'week_paid_so_far')::DECIMAL, 0);
        
        -- Determine Charge based on Tier
        -- Calculate Service Charge dynamically
        v_charge := calculate_plan_service_charge(v_plan_id, v_target);

        IF v_week_paid >= v_target THEN
            -- Success: Deduct Charge from PLAN BALANCE (as per requirement: "Charges are deducted from total of what they paid")
            -- We assume the deposit was added to balance in `process_step_up_deposit`.
            
            UPDATE user_plans
            SET current_balance = current_balance - v_charge,
                plan_metadata = jsonb_set(
                        jsonb_set(
                            plan_metadata,
                            '{week_paid_so_far}',
                            to_jsonb(0)
                        ),
                        '{weeks_completed}',
                        to_jsonb(COALESCE((plan_metadata->>'weeks_completed')::INT, 0) + 1)
                )
            WHERE id = r.id;
            
            -- Record Charge Transaction & Credit Admin
             PERFORM distribute_service_charge(r.user_id, r.id, v_charge, 'Step-Up Weekly Service Charge');

             INSERT INTO transactions (user_id, type, amount, description, status, plan_id)
             VALUES (r.user_id, 'service_charge', v_charge, 'Step-Up Weekly Service Charge', 'completed', v_plan_id);

        ELSE
            -- Failure: Apply Penalty
            -- "Fee of 500 is to be deducted... from the already saved balance"
            UPDATE user_plans
            SET current_balance = current_balance - v_penalty,
                 plan_metadata = jsonb_set(
                    jsonb_set(
                        plan_metadata,
                        '{arrears_amount}',
                         to_jsonb(COALESCE((plan_metadata->>'arrears_amount')::DECIMAL, 0) + (v_target - v_week_paid))
                    ),
                    '{week_paid_so_far}',
                    to_jsonb(0)
                )
            WHERE id = r.id;

             -- Log Penalty
             INSERT INTO transactions (user_id, type, amount, description, status, plan_id)
             VALUES (r.user_id, 'fee', v_penalty, 'Step-Up Missed Week Penalty', 'completed', v_plan_id);
        END IF;
        
        -- Increment Current Week
        -- Check if Plan Completed (Weeks duration met)
        -- TODO: Completion logic
        
    END LOOP;
    RETURN 'Weekly Settlement Completed';
END;
$$;

-- 4. Arrears Recovery Trigger
-- "must be deducted immediately there is a top up to the general wallet"

CREATE OR REPLACE FUNCTION trigger_step_up_arrears_recovery()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    v_step_up_plan_id UUID;
    v_user_plan_id UUID;
    v_arrears DECIMAL;
    v_plan_metadata JSONB;
BEGIN
    -- Only run on 'deposit' to General Wallet (plan_id is NULL)
    IF NEW.type = 'deposit' AND NEW.plan_id IS NULL AND NEW.status = 'completed' THEN
        
        SELECT id INTO v_step_up_plan_id FROM plans WHERE type = 'step_up' LIMIT 1;
        
        -- Check if user has Active Step-Up with Arrears
        SELECT id, plan_metadata INTO v_user_plan_id, v_plan_metadata
        FROM user_plans
        WHERE user_id = NEW.user_id 
          AND plan_id = v_step_up_plan_id 
          AND status = 'active';
          
        v_arrears := COALESCE((v_plan_metadata->>'arrears_amount')::DECIMAL, 0);
        
        IF v_user_plan_id IS NOT NULL AND v_arrears > 0 THEN
            -- Check if Wallet (NEW.amount + existing balance) covers arrears? 
            -- Actually, NEW.amount is just the deposit. We should check available balance.
            -- But for simplicity, let's try to recover what we can or full arrears.
            -- Requirement: "deducting the fixed selected amount... immediately"
            
            -- Logic: Transfer from Wallet to Plan
            -- We trigger the transfer helper.
            -- NOTE: This trigger runs AFTER the deposit transaction insert. 
            -- We need to ensure the balance is available.
            
            -- (Simplification: We call a separate recovery function asynchronously or directly here)
            -- Direct update for atomic operations
            
            IF NEW.amount >= v_arrears THEN
                 -- Full Recovery
                 UPDATE user_plans 
                 SET current_balance = current_balance + v_arrears,
                     plan_metadata = jsonb_set(plan_metadata, '{arrears_amount}', '0')
                 WHERE id = v_user_plan_id;
                 
                 -- Deduct from Wallet (Profile)
                 UPDATE profiles SET balance = balance - v_arrears WHERE id = NEW.user_id;
                 
                 -- Log Internal Transfer
                 INSERT INTO transactions (user_id, type, amount, description, status, plan_id)
                 VALUES (NEW.user_id, 'transfer', v_arrears, 'Step-Up Arrears Auto-Recovery', 'completed', v_step_up_plan_id);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Drop and Recreate Trigger
DROP TRIGGER IF EXISTS trg_step_up_recovery ON transactions;
CREATE TRIGGER trg_step_up_recovery
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_step_up_arrears_recovery();
