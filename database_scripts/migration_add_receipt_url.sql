-- Add receipt_url to transactions table
alter table transactions 
add column if not exists receipt_url text;
