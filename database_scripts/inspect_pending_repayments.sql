-- Select all pending loan repayments
SELECT 
    t.id as transaction_id, 
    t.amount, 
    t.status, 
    t.created_at, 
    t.loan_id, 
    l.total_payable as current_loan_balance
FROM transactions t
JOIN loans l ON t.loan_id = l.id
WHERE t.type = 'loan_repayment' AND t.status = 'pending';
