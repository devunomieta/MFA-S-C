-- FIX: Grant Admin Permissions for Transaction Hub

-- 1. Enable RLS (Ensure it's on)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old policies (Optional, to avoid conflicts, but using IF NOT EXISTS/DO logic is safer. 
-- For simplicity in SQL Editor, we often just DROP and RECREATE for these specific admin policies).

DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all loans" ON loans;
DROP POLICY IF EXISTS "Admins can update loans" ON loans;
DROP POLICY IF EXISTS "Admins can update user_plans" ON user_plans;
DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;

-- 3. Create Admin Policies

-- TRANSACTIONS
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can update transactions" ON transactions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- LOANS
CREATE POLICY "Admins can view all loans" ON loans FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can update loans" ON loans FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- USER_PLANS (For balance updates/refunds)
CREATE POLICY "Admins can update user_plans" ON user_plans FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- APP_SETTINGS (For turning off withdrawals)
CREATE POLICY "Admins can update settings" ON app_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can insert settings" ON app_settings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 4. Ensure Users can still see their own (Fail-safe, usually these exist)
-- Re-asserting user policies just in case they were missing or weird.
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can view own loans" ON loans;
CREATE POLICY "Users can view own loans" ON loans FOR SELECT USING (
    auth.uid() = user_id
);
