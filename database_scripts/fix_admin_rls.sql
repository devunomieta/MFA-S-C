-- Ensure users can read their own profile (including is_admin)
-- This is critical for the app to know if the current user is an admin.

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);
