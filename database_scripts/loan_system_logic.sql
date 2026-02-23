-- Loan System Automation & Security
-- 1. Trigger for Automatic Loan Repayment
CREATE OR REPLACE FUNCTION handle_loan_repayment()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if it's a loan repayment transaction
    IF NEW.type = 'loan_repayment' AND NEW.status = 'completed' AND NEW.loan_id IS NOT NULL THEN
        -- Update the loan balance
        UPDATE loans
        SET total_payable = GREATEST(0, total_payable - NEW.amount),
            updated_at = NOW()
        WHERE id = NEW.loan_id;

        -- If loan is fully paid, mark status as 'paid'
        UPDATE loans
        SET status = 'paid'
        WHERE id = NEW.loan_id AND total_payable <= 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_loan_repayment_transaction ON transactions;
CREATE TRIGGER on_loan_repayment_transaction
    AFTER INSERT ON transactions
    FOR EACH ROW EXECUTE PROCEDURE handle_loan_repayment();

-- 2. Function to Apply Overdue Penalties (Cron-job target)
-- Applies a 5% penalty and marks as 'defaulted'
CREATE OR REPLACE FUNCTION apply_loan_penalties()
RETURNS VOID AS $$
BEGIN
    -- Update loans that are past due_date and not yet paid
    UPDATE loans
    SET status = 'defaulted',
        total_payable = total_payable * 1.05, -- 5% Penalty
        updated_at = NOW()
    WHERE status = 'active'
      AND due_date < NOW()
      AND total_payable > 0;
      
    -- Note: This doesn't create a transaction record, it updates the liability directly.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Hardened RLS Policies for Loans
-- Ensure users can only insert pending loans
DROP POLICY IF EXISTS "Users can insert own loans" ON loans;
CREATE POLICY "Users can insert own loans" ON loans
    FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Ensure users cannot update their own loans directly (must go through transactions/admin)
DROP POLICY IF EXISTS "Users can update own loans" ON loans;
CREATE POLICY "Users can update own loans" ON loans
    FOR UPDATE USING (false); -- Only system triggers (security definer) or admin can update
