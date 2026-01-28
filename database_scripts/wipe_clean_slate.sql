-- DANGER: This script deletes ALL USER DATA including Profiles.
-- After running this, existing Auth Users will still exist in the 'Authentication' system,
-- but their profile data will be gone. You may need to delete the user from the Supabase Authentication dashboard
-- to register again with the same email.

BEGIN;

-- 1. Truncate all user-data tables
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE loans CASCADE;
TRUNCATE TABLE user_plans CASCADE;
TRUNCATE TABLE bank_accounts CASCADE;

-- 2. Delete Profiles (This usually happens last as other tables depend on it)
-- Using DELETE instead of TRUNCATE for profiles often works better with foreign key constraints from auth.users if cascading isn't perfect, 
-- but TRUNCATE CASCADE is stronger.
TRUNCATE TABLE profiles CASCADE;

COMMIT;

-- Verify
SELECT count(*) as profiles_remaining FROM profiles;
