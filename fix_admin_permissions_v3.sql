-- FIX V3: Robust Admin Permissions & Recursion Prevention

-- 1. Create a Secure Function to check Admin Status (Prevents Infinite Recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- IMPORTANT: Runs with privileges of the creator (postgres), bypassing RLS
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Grant Permissions on PROFILES (Critical for the JOIN logic)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
    is_admin() = true
);

DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (
    is_admin() = true
);

-- 3. Re-Apply Updates to Transactions/Loans with the safe function
-- (Simplifies the logic and ensures consistency)

-- Transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (
    is_admin() = true
);

DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
CREATE POLICY "Admins can update transactions" ON transactions FOR UPDATE USING (
    is_admin() = true
);

-- Loans
DROP POLICY IF EXISTS "Admins can view all loans" ON loans;
CREATE POLICY "Admins can view all loans" ON loans FOR SELECT USING (
    is_admin() = true
);

DROP POLICY IF EXISTS "Admins can update loans" ON loans;
CREATE POLICY "Admins can update loans" ON loans FOR UPDATE USING (
    is_admin() = true
);

-- User Plans
DROP POLICY IF EXISTS "Admins can update user_plans" ON user_plans;
CREATE POLICY "Admins can update user_plans" ON user_plans FOR UPDATE USING (
    is_admin() = true
);

-- Settings
DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;
CREATE POLICY "Admins can update settings" ON app_settings FOR UPDATE USING (
    is_admin() = true
);

-- 4. Verify/Re-assert User Access (Fail-safes)
DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
CREATE POLICY "Users can view own profiles" ON profiles FOR SELECT USING (
    auth.uid() = id
);

DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
CREATE POLICY "Users can update own profiles" ON profiles FOR UPDATE USING (
    auth.uid() = id
);
