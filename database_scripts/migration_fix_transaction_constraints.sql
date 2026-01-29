-- Fix transaction type constraint to include all used types
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
    'service_charge'
));
