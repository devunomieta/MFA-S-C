-- Monthly Bloom Logic

-- 1. Process Manual Deposit
-- Called after funds are deducted from General Wallet
CREATE OR REPLACE FUNCTION process_monthly_bloom_deposit(
    p_amount NUMERIC,
    p_plan_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_plan RECORD;
    v_new_balance NUMERIC;
    v_metadata JSONB;
    v_month_paid_so_far NUMERIC;
BEGIN
    SELECT * INTO v_user_plan FROM user_plans 
    WHERE id = p_plan_id AND user_id = p_user_id AND status IN ('active', 'pending_activation');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active or Pending Plan not found';
    END IF;

    v_metadata := v_user_plan.plan_metadata;
    
    -- [NEW] Spread Logic
    DECLARE
        v_total_available NUMERIC;
        v_months_to_advance INT;
        v_remainder NUMERIC;
        v_months_done INT;
        v_target_amount NUMERIC;
        v_selected_duration INT;
    BEGIN
        v_target_amount := COALESCE((v_metadata->>'target_amount')::NUMERIC, 20000);
        v_selected_duration := COALESCE((v_metadata->>'selected_duration')::INT, 10);
        v_months_done := COALESCE((v_metadata->>'months_completed')::INT, 0);
        v_total_available := COALESCE((v_metadata->>'month_paid_so_far')::NUMERIC, 0) + p_amount;
        
        v_months_to_advance := FLOOR(v_total_available / v_target_amount)::INT;
        
        -- Cap months_done at selected_duration
        IF (v_months_done + v_months_to_advance) >= v_selected_duration THEN
            v_month_paid_so_far := v_total_available - ((v_selected_duration - v_months_done) * v_target_amount);
            v_months_done := v_selected_duration;
        ELSE
            v_months_done := v_months_done + v_months_to_advance;
            v_month_paid_so_far := v_total_available % v_target_amount;
        END IF;
        
        v_metadata := jsonb_set(v_metadata, '{months_completed}', to_jsonb(v_months_done));
    END;

    v_new_balance := v_user_plan.current_balance + p_amount;
    
    -- [RESTORED] Update Plan
    UPDATE user_plans
    SET
        status = 'active',
        start_date = COALESCE(start_date, NOW()),
        current_balance = v_new_balance,
        plan_metadata = jsonb_set(
            jsonb_set(v_metadata, '{month_paid_so_far}', to_jsonb(v_month_paid_so_far)),
            '{last_payment_date}',
            to_jsonb(NOW())
        ),
        updated_at = NOW()
    WHERE id = p_plan_id;

    -- Record Transaction
    INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
    VALUES (p_user_id, v_user_plan.plan_id, p_amount, 'deposit', 'completed', 'Monthly Bloom Contribution', 0);

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'month_paid_so_far', v_month_paid_so_far
    );
END;
$$;


-- 2. Settle Monthly Bloom Month
-- To be run at 11:59PM on the Last Day of the Month
CREATE OR REPLACE FUNCTION settle_monthly_bloom_month()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan RECORD;
    v_user_plan RECORD;
    v_metadata JSONB;
    v_month_paid NUMERIC;
    v_target_amount NUMERIC;
    v_months_completed INTEGER;
    v_selected_duration INTEGER;
    v_arrears NUMERIC;
    v_service_charge NUMERIC := 2000;
    v_count INTEGER := 0;
BEGIN
    -- Get Plan ID
    SELECT * INTO v_plan FROM plans WHERE type = 'monthly_bloom' LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('message', 'Plan not found'); END IF;

    FOR v_user_plan IN 
        SELECT * FROM user_plans 
        WHERE plan_id = v_plan.id 
        AND status = 'active'
    LOOP
        v_metadata := v_user_plan.plan_metadata;
        v_month_paid := COALESCE((v_metadata->>'month_paid_so_far')::NUMERIC, 0);
        v_target_amount := COALESCE((v_metadata->>'target_amount')::NUMERIC, 20000);
        v_months_completed := COALESCE((v_metadata->>'months_completed')::INTEGER, 0);
        v_selected_duration := COALESCE((v_metadata->>'selected_duration')::INTEGER, 4);
        v_arrears := COALESCE((v_metadata->>'arrears')::NUMERIC, 0);

        -- 1. Deduct Service Charge (2000)
        -- Deducted from CURRENT BALANCE (already saved funds) per requirement
        -- "monthly charge of 2000 will still be deducted... from the already saved balance"
        UPDATE user_plans
        SET current_balance = current_balance - v_service_charge
        WHERE id = v_user_plan.id;

        -- Record Charge Transaction
        INSERT INTO transactions (user_id, plan_id, amount, type, status, description, charge)
        VALUES (v_user_plan.user_id, v_user_plan.id, v_service_charge, 'service_charge', 'completed', 'Monthly Bloom Service Charge', 0);

        -- 2. Check Target
        -- [NEW] Advance Payment Check
    DECLARE
        v_months_elapsed INT;
    BEGIN
        v_months_elapsed := FLOOR(EXTRACT(EPOCH FROM (NOW() - v_user_plan.start_date)) / 2592000)::INT; -- ~30 days
        
        IF v_months_completed > v_months_elapsed THEN
            v_metadata := jsonb_set(v_metadata, '{month_paid_so_far}', '0');
            v_metadata := jsonb_set(v_metadata, '{last_settlement_date}', to_jsonb(NOW()));
            
            UPDATE user_plans SET plan_metadata = v_metadata WHERE id = v_user_plan.id;
            RETURN jsonb_build_object('success', true, 'status', 'prepaid_skip');
        END IF;
    END;

    IF v_month_paid < v_target_amount THEN
            -- Add deficit to Arrears
            v_arrears := v_arrears + (v_target_amount - v_month_paid);
        END IF;

        -- 3. Increment Month
        v_months_completed := v_months_completed + 1;

        -- 4. Check Maturity
        IF v_months_completed >= v_selected_duration THEN
            -- Matured
             UPDATE user_plans
            SET 
                status = 'matured',
                plan_metadata = jsonb_set(
                    jsonb_set(
                        jsonb_set(v_metadata, '{months_completed}', to_jsonb(v_months_completed)),
                        '{month_paid_so_far}', 
                        '0'
                    ),
                    '{arrears}',
                    to_jsonb(v_arrears)
                )
            WHERE id = v_user_plan.id;
        ELSE
            -- Just Next Month
            UPDATE user_plans
            SET 
                plan_metadata = jsonb_set(
                    jsonb_set(
                        jsonb_set(v_metadata, '{months_completed}', to_jsonb(v_months_completed)),
                        '{month_paid_so_far}', 
                        '0'
                    ),
                    '{arrears}',
                    to_jsonb(v_arrears)
                )
            WHERE id = v_user_plan.id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'settled_count', v_count);
END;
$$;


-- 3. Auto-Save (Last Day of Month)
-- Retries every 6h (Managed by Cron Schedule, this function just attempts ONCE)
CREATE OR REPLACE FUNCTION trigger_monthly_bloom_auto_save()
RETURNS TABLE (
    user_id UUID,
    amount_covered NUMERIC,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan_id UUID;
    v_user_plan RECORD;
    v_metadata JSONB;
    v_month_paid NUMERIC;
    v_target_amount NUMERIC;
    v_deficit NUMERIC;
    v_wallet_balance NUMERIC;
BEGIN
    SELECT id INTO v_plan_id FROM plans WHERE type = 'monthly_bloom' LIMIT 1;

    FOR v_user_plan IN 
        SELECT * FROM user_plans 
        WHERE plan_id = v_plan_id 
        AND status = 'active'
    LOOP
        v_metadata := v_user_plan.plan_metadata;
        v_month_paid := COALESCE((v_metadata->>'month_paid_so_far')::NUMERIC, 0);
        v_target_amount := COALESCE((v_metadata->>'target_amount')::NUMERIC, 20000);
        
        v_deficit := v_target_amount - v_month_paid;

        IF v_deficit > 0 THEN
            -- Check General Wallet
            SELECT current_balance INTO v_wallet_balance FROM user_plans 
            WHERE user_id = v_user_plan.user_id AND plan_id IS NULL; -- General Wallet

            IF v_wallet_balance >= v_deficit THEN
                -- Debit Wallet
                UPDATE user_plans SET current_balance = current_balance - v_deficit 
                WHERE user_id = v_user_plan.user_id AND plan_id IS NULL;
                
                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (v_user_plan.user_id, v_deficit, 'debit', 'completed', 'Auto-Save: Monthly Bloom', NULL, 0);

                -- Credit Plan
                UPDATE user_plans SET 
                    current_balance = current_balance + v_deficit,
                    plan_metadata = jsonb_set(v_metadata, '{month_paid_so_far}', to_jsonb(v_month_paid + v_deficit))
                WHERE id = v_user_plan.id;

                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (v_user_plan.user_id, v_deficit, 'deposit', 'completed', 'Auto-Save: Monthly Bloom', v_user_plan.id, 0);

                RETURN QUERY SELECT v_user_plan.user_id, v_deficit, 'Covered';
            ELSE
                 RETURN QUERY SELECT v_user_plan.user_id, v_deficit, 'Insufficient Funds';
            END IF;
        END IF;
    END LOOP;
END;
$$;


-- 4. Arrears Recovery Trigger
CREATE OR REPLACE FUNCTION trigger_monthly_bloom_arrears_recovery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan_id UUID;
    v_user_plan RECORD;
    v_metadata JSONB;
    v_arrears NUMERIC;
    v_recovery_amount NUMERIC;
BEGIN
    -- Check if it's a deposit to General Wallet (plan_id IS NULL)
    IF NEW.plan_id IS NULL AND NEW.type = 'deposit' AND NEW.status = 'completed' THEN
        
        -- Find Monthly Bloom Plan
        SELECT id INTO v_plan_id FROM plans WHERE type = 'monthly_bloom' LIMIT 1;
        
        -- Find User's Active Monthly Bloom Plan with Arrears
        SELECT * INTO v_user_plan 
        FROM user_plans 
        WHERE user_id = NEW.user_id 
        AND plan_id = v_plan_id 
        AND status = 'active'
        LIMIT 1;

        IF FOUND THEN
            v_metadata := v_user_plan.plan_metadata;
            v_arrears := COALESCE((v_metadata->>'arrears')::NUMERIC, 0);

            IF v_arrears > 0 THEN
                -- Take whatever is available in wallet (NEW.amount + existing balance)
                -- Actually we should check live balance.
                -- For Simplicity, let's just use the NEW amount to cover arrears, or up to arrears.
                
                -- NOTE: We must check CURRENT wallet balance, because maybe they had some money before too? 
                -- But usually triggers happen AFTER the row insert. But wallet balance update happens separately usually? 
                -- Wait, 'transactions' insert usually happens alongside wallet update.
                -- Let's assume the wallet has sufficient funds if we just check the wallet balance NOW.
                
                DECLARE
                    v_wallet_bal NUMERIC;
                BEGIN
                    SELECT current_balance INTO v_wallet_bal FROM user_plans WHERE user_id = NEW.user_id AND plan_id IS NULL;
                    
                    v_recovery_amount := LEAST(v_wallet_bal, v_arrears);
                    
                    IF v_recovery_amount > 0 THEN
                        -- Debit Wallet
                        UPDATE user_plans SET current_balance = current_balance - v_recovery_amount
                        WHERE user_id = NEW.user_id AND plan_id IS NULL;

                        INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                        VALUES (NEW.user_id, v_recovery_amount, 'debit', 'completed', 'Arrears Recovery: Monthly Bloom', NULL, 0);

                        -- Credit Plan (BUT Reduces Arrears, DOES NOT Count towards current month progress usually? Or does it?)
                        -- Arrears are missed payments. It should add to plan balance.
                        UPDATE user_plans SET 
                            current_balance = current_balance + v_recovery_amount,
                            plan_metadata = jsonb_set(v_metadata, '{arrears}', to_jsonb(v_arrears - v_recovery_amount))
                        WHERE id = v_user_plan.id;

                         INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                        VALUES (NEW.user_id, v_recovery_amount, 'deposit', 'completed', 'Arrears Recovery: Monthly Bloom', v_user_plan.id, 0);
                    END IF;
                END;
            END IF;
        END IF;

    END IF;
    RETURN NEW;
END;
$$;

-- Register Trigger
DROP TRIGGER IF EXISTS trg_monthly_bloom_recovery ON transactions;
CREATE TRIGGER trg_monthly_bloom_recovery
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_monthly_bloom_arrears_recovery();
