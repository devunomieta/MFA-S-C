-- FIX 500 ERROR: INFINITE RECURSION (Revised for Permissions)
-- Moving function to 'public' schema to avoid 'permission denied for schema auth' error.

-- 1. Drop the potential recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 2. Create the SECURITY DEFINER function in PUBLIC schema
-- This function allows checking admin status without triggering RLS loops.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the policy using the public function
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- 4. Ensure the simpler policy also exists
-- This allows users to read their own profile to see if they are admin or not (essential for the app logic)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);
