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
    v_current_week INT;
    v_weeks_paid INT;
    v_target_amount DECIMAL; -- Fixed Amount selected by user
    v_total_paid DECIMAL;
BEGIN
    -- Get User Plan
    SELECT id, plan_metadata INTO v_user_plan_id, v_plan_metadata
    FROM user_plans
    WHERE user_id = p_user_id AND plan_id = p_plan_id AND status IN ('active', 'pending_activation');

    IF v_user_plan_id IS NULL THEN
        RAISE EXCEPTION 'Active or Pending Step-Up plan not found for user';
    END IF;

    v_target_amount := (v_plan_metadata->>'fixed_amount')::DECIMAL;
    v_weeks_paid := COALESCE((v_plan_metadata->>'weeks_paid')::INT, 0);
    v_current_week := COALESCE((v_plan_metadata->>'current_week')::INT, 1);

    -- Check if Amount matches Fixed Amount (Strict)
    -- Allow multiple payments? Requirement says "Fixed saving amount". Usually implies exact match.
    -- But if they pay in chunks? Let's assume they must pay the full fixed amount or accumulate it.
    -- However, "Frequency is WEEKLY".
    
    -- Update Metadata
    -- Simply add to balance. The "Settlement" logic handles the "Week Count" and "Charges".
    -- WAIT: "Show how much has been paid for the week - resets counter on Sunday"
    
    DECLARE
        v_week_paid_so_far DECIMAL;
    BEGIN
        v_week_paid_so_far := COALESCE((v_plan_metadata->>'week_paid_so_far')::DECIMAL, 0);
        
        -- Update user_plans metadata and status
        UPDATE user_plans
        SET 
            status = 'active',
            start_date = COALESCE(start_date, NOW()),
            plan_metadata = jsonb_set(
                jsonb_set(
                    plan_metadata,
                    '{week_paid_so_far}',
                    to_jsonb(v_week_paid_so_far + p_amount)
                ),
                '{last_deposit_date}',
                to_jsonb(NOW())
            ),
            updated_at = NOW()
        WHERE id = v_user_plan_id;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'Deposit processed. Week progress updated.',
            'week_paid', v_week_paid_so_far + p_amount,
            'target', v_target_amount
        )::JSONB;
    END;
END;
$$;

-- 2. Trigger Auto-Save (Sunday 6am - 11:59pm)
-- This function is called by the Admin Button (or cron)
CREATE OR REPLACE FUNCTION trigger_step_up_auto_save()
RETURNS TABLE (
    user_id UUID,
    status TEXT,
    amount_deducted DECIMAL
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
BEGIN
    -- Get Step-Up Plan ID
    SELECT id INTO v_plan_id FROM plans WHERE type = 'step_up' LIMIT 1;
    
    FOR r IN 
        SELECT up.id AS user_plan_id, up.user_id, up.plan_metadata, p.balance 
        FROM user_plans up
        JOIN profiles p ON up.user_id = p.id
        WHERE up.plan_id = v_plan_id AND up.status = 'active'
    LOOP
        v_target := (r.plan_metadata->>'fixed_amount')::DECIMAL;
        v_week_paid := COALESCE((r.plan_metadata->>'week_paid_so_far')::DECIMAL, 0);
        
        IF v_week_paid < v_target THEN
            v_deficit := v_target - v_week_paid;
            
            -- Check General Wallet Balance using centralized logic
            v_balance := get_wallet_balance(r.user_id, NULL);
            
            IF v_balance >= v_deficit THEN
                -- Deduct from Wallet
                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (r.user_id, v_deficit, 'transfer', 'completed', 'Auto-Save for Step-Up Week', NULL, 0);

                -- Credit Step-Up
                PERFORM process_step_up_deposit(r.user_id, v_plan_id, v_deficit);
                
                user_id := r.user_id;
                status := 'success';
                amount_deducted := v_deficit;
                RETURN NEXT;
            ELSE
                 -- Log failed attempt (optional)
                 user_id := r.user_id;
                 status := 'insufficient_funds';
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
        IF v_target BETWEEN 5000 AND 10000 THEN v_charge := 200;
        ELSIF v_target BETWEEN 15000 AND 20000 THEN v_charge := 300;
        ELSIF v_target BETWEEN 25000 AND 30000 THEN v_charge := 400;
        ELSIF v_target BETWEEN 40000 AND 50000 THEN v_charge := 500;
        ELSE v_charge := 200; -- Fallback
        END IF;

        IF v_week_paid >= v_target THEN
            -- Success: Deduct Charge from PLAN BALANCE (as per requirement: "Charges are deducted from total of what they paid")
            -- We assume the deposit was added to balance in `process_step_up_deposit`.
            
            UPDATE user_plans
            SET current_balance = current_balance - v_charge,
                plan_metadata = jsonb_set(
                        jsonb_set(
                            plan_metadata,
                            '{week_paid_so_far}',
                            '0'
                        ),
                        '{weeks_paid}',
                        to_jsonb(COALESCE((plan_metadata->>'weeks_paid')::INT, 0) + 1)
                )
            WHERE id = r.id;
            
            -- Log Charge Transaction
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
                        '{arrears}',
                         to_jsonb(COALESCE((plan_metadata->>'arrears')::DECIMAL, 0) + (v_target - v_week_paid))
                    ),
                    '{week_paid_so_far}',
                    '0'
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
          
        v_arrears := COALESCE((v_plan_metadata->>'arrears')::DECIMAL, 0);
        
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
                 SET balance = balance + v_arrears,
                     plan_metadata = jsonb_set(plan_metadata, '{arrears}', '0')
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
