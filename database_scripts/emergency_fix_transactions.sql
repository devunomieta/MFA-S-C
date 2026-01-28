-- EMERGENCY FIX for Transactions Table

BEGIN;

-- 1. Ensure Table Exists (If it was accidentally dropped, though unlikely)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null, -- Use auth.users or profiles
  plan_id uuid, -- Keeping it generic (uuid) to avoid strict FK if mismatch
  amount numeric not null,
  charge numeric default 0,
  type text not null,
  status text default 'pending',
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Ensure Columns Exist (Idempotent)
DO $$ 
BEGIN 
    -- Add receipt_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='receipt_url') THEN
        ALTER TABLE transactions ADD COLUMN receipt_url text;
    END IF;

    -- Add loan_id if missing (It was added in migration, but let's be safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='loan_id') THEN
        ALTER TABLE transactions ADD COLUMN loan_id uuid references loans(id);
    END IF;
END $$;

-- 3. Fix RLS Policies (Drop and Recreate)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Fix User Plans RLS (Just in case)
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update own plans" ON user_plans;
CREATE POLICY "Users can update own plans" ON user_plans
    FOR UPDATE USING (auth.uid() = user_id);

COMMIT;

-- Verify
SELECT * FROM information_schema.columns WHERE table_name = 'transactions';
