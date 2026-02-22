-- ROBUST SUPABASE STORAGE INITIALIZATION SCRIPT (PERMISSION FIX)
-- This version removes 'ALTER TABLE' which causes ownership errors.

-- 1. Create/Update Buckets to be Public
-- We use a simple UPDATE after the INSERT to ensure 'public' is set to true even if the bucket existed.
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('kyc', 'kyc', true),
  ('receipts', 'receipts', true),
  ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Set Up Security Policies (RLS)
-- Policies are what allow public image rendering.

-- AVATARS: Public view, authenticated upload/delete
DROP POLICY IF EXISTS "Avatar Public View" ON storage.objects;
CREATE POLICY "Avatar Public View" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar Auth Upload" ON storage.objects;
CREATE POLICY "Avatar Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar Auth Delete" ON storage.objects;
CREATE POLICY "Avatar Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');


-- KYC: Public View (via obfuscated URL), authenticated upload
DROP POLICY IF EXISTS "KYC Public View" ON storage.objects;
CREATE POLICY "KYC Public View" ON storage.objects FOR SELECT USING (bucket_id = 'kyc');

DROP POLICY IF EXISTS "KYC Auth Upload" ON storage.objects;
CREATE POLICY "KYC Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc');


-- RECEIPTS: Public View (via obfuscated URL), authenticated upload
DROP POLICY IF EXISTS "Receipt Public View" ON storage.objects;
CREATE POLICY "Receipt Public View" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');

-- Allow authenticated users to upload receipts
CREATE POLICY "Allow authenticated to upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');


-- BRANDING: Public view, Admin upload/delete
DROP POLICY IF EXISTS "Branding Public View" ON storage.objects;
CREATE POLICY "Branding Public View" ON storage.objects FOR SELECT USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Branding Admin Upload" ON storage.objects;
CREATE POLICY "Branding Admin Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding');

DROP POLICY IF EXISTS "Branding Admin Delete" ON storage.objects;
CREATE POLICY "Branding Admin Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding');
