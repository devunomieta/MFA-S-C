-- 1. Add is_admin column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Update RLS Policies to allow Admin Access

-- PROFILES (Admin can view all)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- TRANSACTIONS (Admin can view all, update status)
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions" ON transactions
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
CREATE POLICY "Admins can update transactions" ON transactions
    FOR UPDATE TO authenticated
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- LOANS (Admin can view all, update status)
DROP POLICY IF EXISTS "Admins can view all loans" ON loans;
CREATE POLICY "Admins can view all loans" ON loans
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

DROP POLICY IF EXISTS "Admins can update loans" ON loans;
CREATE POLICY "Admins can update loans" ON loans
    FOR UPDATE TO authenticated
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- USER PLANS (Admin can view all)
DROP POLICY IF EXISTS "Admins can view all user_plans" ON user_plans;
CREATE POLICY "Admins can view all user_plans" ON user_plans
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
