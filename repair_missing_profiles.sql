-- DATA RECOVERY: Restore Missing Profiles
-- This fixes the "Foreign Key Constraint" error by ensuring every Auth User has a Public Profile.

INSERT INTO public.profiles (id, email, full_name)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', 'User ' || substring(id::text, 1, 4))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Verification
SELECT count(*) as profiles_restored FROM profiles;
