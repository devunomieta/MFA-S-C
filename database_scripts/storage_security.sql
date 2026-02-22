-- SECURITY RECOMMENDATIONS FOR SUPABASE STORAGE
-- These policies should be applied in the Supabase Dashboard SQL Editor
-- to enforce security constraints on the server-side.

-- 1. KYC Bucket Security
-- Ensure only authenticated users can upload to their own folder
-- and enforce file type/size limits.

-- Policy: Allow uploads ONLY if type is Image or PDF and size < 5MB
-- Note: Subabase Storage policies for file size/type are easier to set
-- via the 'Bucket Configuration' in the UI, but here is an example RLS:

/*
CREATE POLICY "Strict KYC Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc' AND
  (storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'pdf'])) AND
  (content_length() <= 5242880) -- 5MB in bytes
);
*/

-- 2. Receipt Bucket Security (Proof of Payment)
/*
CREATE POLICY "Strict Receipt Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'pdf'])) AND
  (content_length() <= 5242880) -- 5MB in bytes
);
*/

-- 3. Profile Avatars
/*
CREATE POLICY "Avatar Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png'])) AND
  (content_length() <= 2097152) -- 2MB in bytes
);
*/

-- IMPORTANT: Always ensure buckets are set to 'Private' unless
-- public access is explicitly required for non-sensitive assets.
