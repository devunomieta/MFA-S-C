-- Add plan_id and charge columns to transactions table
alter table transactions 
add column if not exists plan_id uuid references plans(id),
add column if not exists charge numeric default 0;

-- Optional: Update RLS if needed (usually covered by existing 'select' policy)
