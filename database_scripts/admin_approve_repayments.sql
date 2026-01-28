-- Function to approve a specific loan repayment transaction
CREATE OR REPLACE FUNCTION approve_loan_repayment(txn_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_loan_id UUID;
    v_amount NUMERIC;
    v_user_id UUID;
    v_current_debt NUMERIC;
    v_new_debt NUMERIC;
BEGIN
    -- 1. Get Transaction Details
    SELECT loan_id, amount, user_id INTO v_loan_id, v_amount, v_user_id
    FROM transactions 
    WHERE id = txn_id AND type = 'loan_repayment' AND status = 'pending';

    IF NOT FOUND THEN
        RAISE NOTICE 'Transaction % not found or not a pending repayment.', txn_id;
        RETURN;
    END IF;

    -- 2. Fallback: If loan_id is NULL (legacy), try to find the USER's active loan
    IF v_loan_id IS NULL THEN
        SELECT id INTO v_loan_id 
        FROM loans 
        WHERE user_id = v_user_id AND status = 'active' 
        LIMIT 1;
        
        IF v_loan_id IS NOT NULL THEN
            -- Link it for future history
            UPDATE transactions SET loan_id = v_loan_id WHERE id = txn_id;
            RAISE NOTICE 'Linked orphan transaction % to active loan %', txn_id, v_loan_id;
        ELSE
            RAISE EXCEPTION 'Cannot approve repayment: No active loan found to link to.';
        END IF;
    END IF;

    -- 3. Get Current Loan Details
    SELECT total_payable INTO v_current_debt
    FROM loans
    WHERE id = v_loan_id;

    -- 4. Calculate New Balance
    v_new_debt := v_current_debt - v_amount;
    
    -- 5. Update Loan
    UPDATE loans 
    SET 
        total_payable = v_new_debt,
        status = CASE WHEN v_new_debt <= 0 THEN 'paid' ELSE status END
    WHERE id = v_loan_id;

    -- 6. Update Transaction Status
    UPDATE transactions 
    SET status = 'completed' 
    WHERE id = txn_id;

    RAISE NOTICE 'Approved repayment %. New Loan Balance: %', v_amount, v_new_debt;
END;
$$ LANGUAGE plpgsql;

-- Executing the block to approve ALL currently pending loan repayments
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id FROM transactions 
        WHERE type = 'loan_repayment' AND status = 'pending'
    LOOP
        PERFORM approve_loan_repayment(r.id);
    END LOOP;
END;
$$;
