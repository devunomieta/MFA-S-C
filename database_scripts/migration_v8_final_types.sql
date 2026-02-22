
-- Final Schema Hardening for Launch
-- Add 'limit_transfer' and 'service_charge'/'fee' to transaction types
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
    'deposit', 
    'withdrawal', 
    'loan_disbursement', 
    'loan_repayment', 
    'interest', 
    'transfer', 
    'fee', 
    'service_charge',
    'limit_transfer'
));

-- Ensure user_plans status includes all needed states
ALTER TABLE user_plans DROP CONSTRAINT IF EXISTS user_plans_status_check;

ALTER TABLE user_plans ADD CONSTRAINT user_plans_status_check 
CHECK (status IN (
    'active', 
    'completed', 
    'cancelled', 
    'matured', 
    'pending_activation'
));

-- Verify 'plans' table has min_amount and service_charge
-- (Assuming they already exist from previous migrations)
