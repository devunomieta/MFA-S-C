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

    -- 3. Create Disbursement Transaction (Credit User)
    INSERT INTO transactions (
        user_id,
        amount,
        type,
        status,
        description,
        charge,
        loan_id,    -- Link to the loan
        created_at
    ) VALUES (
        v_loan.user_id,
        v_loan.amount,
        'loan_disbursement',
        'completed', -- Money is disbursed
        'Loan Disbursement: ' || COALESCE(v_loan.loan_number, 'LN-' || substring(target_loan_id::text, 1, 8)),
        0,
        target_loan_id,
        NOW()
    );

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
