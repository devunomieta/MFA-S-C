-- REPLACE 'admin@marysthrift.com' WITH THE ACTUAL EMAIL.
-- OR Use the ID directly if known.

UPDATE profiles
SET is_admin = true
WHERE email = 'admin@marysthrift.com'; -- CHANGE THIS EMAIL

-- Verification
SELECT * FROM profiles WHERE is_admin = true;
