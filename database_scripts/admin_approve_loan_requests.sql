-- Function to Approve a Loan Request
-- Usage: SELECT approve_loan('LOAN_UUID_HERE');

CREATE OR REPLACE FUNCTION approve_loan(target_loan_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_loan RECORD;
BEGIN
    -- 1. Get Loan Details
    SELECT * INTO v_loan FROM loans WHERE id = target_loan_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Loan % not found or not pending.', target_loan_id;
        RETURN;
    END IF;

    -- 2. Update Loan Status to 'active' and set due_date
    UPDATE loans 
    SET status = 'active', 
        due_date = NOW() + (v_loan.duration_months || ' months')::interval,
        updated_at = NOW()
    WHERE id = target_loan_id;

    -- 3. Create Disbursement Transaction (Credit Withdrawable Wallet)
    DECLARE
        v_target_plan_id UUID;
        v_target_user_plan_id UUID;
    BEGIN
        SELECT id INTO v_target_plan_id FROM plans WHERE type = 'withdrawable_wallet' LIMIT 1;
        
        IF v_target_plan_id IS NOT NULL THEN
            -- Get or Create the User's Withdrawable Wallet record
            SELECT id INTO v_target_user_plan_id FROM user_plans 
            WHERE user_id = v_loan.user_id AND plan_id = v_target_plan_id LIMIT 1;

            IF v_target_user_plan_id IS NULL THEN
                INSERT INTO user_plans (user_id, plan_id, current_balance, status, start_date)
                VALUES (v_loan.user_id, v_target_plan_id, 0, 'matured', NOW())
                RETURNING id INTO v_target_user_plan_id;
            END IF;

            -- Update Balance
            UPDATE user_plans SET current_balance = current_balance + v_loan.amount WHERE id = v_target_user_plan_id;
            
            INSERT INTO transactions (
                user_id,
                amount,
                type,
                status,
                description,
                charge,
                loan_id,    -- Link to the loan
                plan_id,    -- Link to Withdrawable Wallet
                created_at
            ) VALUES (
                v_loan.user_id,
                v_loan.amount,
                'loan_disbursement',
                'completed',
                'Loan Disbursement: ' || COALESCE(v_loan.loan_number, 'LN-' || substring(target_loan_id::text, 1, 8)),
                0,
                target_loan_id,
                v_target_plan_id,
                NOW()
            );
        ELSE
            -- Fallback to General Wallet if not configured
            INSERT INTO transactions (user_id, amount, type, status, description, charge, loan_id, created_at)
            VALUES (v_loan.user_id, v_loan.amount, 'loan_disbursement', 'completed', 'Loan Disbursement (To General Wallet)', 0, target_loan_id, NOW());
        END IF;
    END;

    RAISE NOTICE 'Loan % Approved and Disbursed.', target_loan_id;
END;
$$ LANGUAGE plpgsql;

-- EXAMPLE: Approve ALL pending loans (Uncomment to run)
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--    FOR r IN SELECT id FROM loans WHERE status = 'pending' LOOP
--        PERFORM approve_loan(r.id);
--    END LOOP;
-- END;
-- $$;
