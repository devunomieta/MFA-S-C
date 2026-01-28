-- Add 'transfer' to transaction types
alter table transactions drop constraint transactions_type_check;

alter table transactions add constraint transactions_type_check 
check (type in ('deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'interest', 'transfer'));
