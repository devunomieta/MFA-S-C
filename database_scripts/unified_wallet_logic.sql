-- Centralized Wallet & Plan Balance Logic

-- 1. Unified Balance Function
-- This function handles both General Wallet (plan_id IS NULL) 
-- and the specialized Withdrawable Wallet (plan_id matches specific system plan).
CREATE OR REPLACE FUNCTION get_wallet_balance(
    p_user_id UUID,
    p_plan_id UUID DEFAULT NULL
) 
RETURNS NUMERIC AS $$
DECLARE
    v_balance NUMERIC := 0;
BEGIN
    -- If p_plan_id is NULL, we are looking at the GENERAL WALLET.
    -- If p_plan_id is NOT NULL, we are looking at a SPECIFIC PLAN (including Withdrawable Wallet).

    SELECT COALESCE(SUM(
        CASE 
            -- INFLOWS
            WHEN type IN ('deposit', 'loan_disbursement', 'interest', 'limit_transfer', 'payout', 'maturity_payout') 
                 AND status = 'completed' THEN amount
            
            -- OUTFLOWS
            WHEN type IN ('withdrawal', 'loan_repayment', 'fee', 'service_charge', 'penalty') 
                 AND status IN ('completed', 'pending') THEN -amount - COALESCE(charge, 0)
            
            -- TRANSFERS (Only if it's the General Wallet context)
            -- For a specific plan, deposits are usually 'deposit' or 'internal_transfer'? 
            -- Let's say 'transfer' with plan_id set is an outflow from wallet, inflow to plan.
            WHEN type = 'transfer' AND p_plan_id IS NULL AND status = 'completed' THEN -amount - COALESCE(charge, 0)
            WHEN type = 'transfer' AND p_plan_id IS NOT NULL AND status = 'completed' THEN amount
            
            -- INTERNAL TRANSFERS
            WHEN type = 'internal_transfer' AND status = 'completed' THEN
                CASE WHEN plan_id = p_plan_id THEN amount ELSE -amount END

            ELSE 0
        END
    ), 0) INTO v_balance
    FROM transactions
    WHERE user_id = p_user_id 
      AND (
          (p_plan_id IS NULL AND plan_id IS NULL) -- General Wallet
          OR 
          (p_plan_id IS NOT NULL AND plan_id = p_plan_id) -- Specific Plan
      );

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
