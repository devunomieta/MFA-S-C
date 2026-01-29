-- Function to be called via Cron (Sunday 6am) or Manually by Admin
-- Checks all Sprint users. If week total < 3000, tries to take from General Wallet.

CREATE OR REPLACE FUNCTION trigger_sprint_auto_save()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    amount_needed NUMERIC,
    status TEXT
) AS $$
DECLARE
    r RECORD;
    wallet_bal NUMERIC;
    deficit NUMERIC;
    p_profile RECORD;
BEGIN
    FOR r IN
        SELECT 
            up.id as user_plan_id, 
            up.user_id, 
            up.plan_id,
            COALESCE((up.plan_metadata->>'current_week_total')::NUMERIC, 0) as current_week_total
        FROM user_plans up
        JOIN plans p ON up.plan_id = p.id
        WHERE p.type = 'sprint' AND up.status = 'active'
    LOOP
        -- 1. Calculate Deficit
        IF r.current_week_total < 3000 THEN
            deficit := 3000 - r.current_week_total;

            -- Get User Name for Report
            SELECT full_name INTO p_profile FROM profiles WHERE id = r.user_id;

            -- 2. Check General Wallet Balance
            -- Helper query to calculate balance same as frontend
            SELECT COALESCE(SUM(
                CASE
                    WHEN type IN ('deposit', 'loan_disbursement', 'limit_transfer') AND status = 'completed' THEN amount
                    WHEN type IN ('withdrawal', 'loan_repayment') AND status IN ('completed', 'pending') THEN -amount - COALESCE(charge, 0)
                    WHEN type = 'transfer' AND status = 'completed' THEN -amount - COALESCE(charge, 0) -- outgoing
                    ELSE 0
                END
            ), 0) INTO wallet_bal
            FROM transactions
            WHERE user_id = r.user_id AND plan_id IS NULL;

            -- 3. If funds available, transfer
            IF wallet_bal >= deficit THEN
                -- Deduct from Wallet
                INSERT INTO transactions (user_id, amount, type, status, description, plan_id, charge)
                VALUES (r.user_id, deficit, 'transfer', 'completed', 'Auto-Save for Sprint (Sunday Check)', NULL, 0);

                -- Credit Sprint via RPC
                PERFORM process_sprint_deposit(r.user_id, r.plan_id, deficit);

                user_id := r.user_id;
                full_name := p_profile.full_name;
                amount_needed := deficit;
                status := 'Covered';
                RETURN NEXT;
            ELSE
                 user_id := r.user_id;
                 full_name := p_profile.full_name;
                 amount_needed := deficit;
                 status := 'Insufficient Funds';
                 RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
