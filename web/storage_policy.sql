-- 1. Create the 'avatars' bucket if it doesn't exist, and ensure it is PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable Public Read Access (Required for getPublicUrl to work for users)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 3. Allow Authenticated Uploads (If you want users to upload directly, though we use Admin in Server Action)
-- Since we use supabaseAdmin in the Server Action, we don't technically need an INSERT policy for the user,
-- but having one is good practice if we switch to client-side upload later.
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- 4. Allow users to update/delete their own files (Optional, for cleanup)
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );
