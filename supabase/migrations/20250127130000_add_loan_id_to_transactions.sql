-- Add loan_id to transactions table
alter table transactions 
add column loan_id uuid references loans(id);

-- Update RLS if needed (though existing owner policy should cover it if user_id is set)
-- No RLS change needed as 'Users can view own transactions' uses user_id
