-- 1. Create the bucket (if not already done)
-- Note: You can also do this in the Supabase UI. 
-- Ensure the bucket name is 'profile-photos' and it is set to PUBLIC.

-- 2. Enable RLS on storage.objects (usually enabled by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy to allow users to upload their own photos
-- We use (storage.foldername(name))[1] to check the folder name, 
-- which in our code is the user's ID: `${user.id}/${Date.now()}...`
CREATE POLICY "Allow users to upload their own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Policy to allow anyone to view the photos (since it's a public bucket)
CREATE POLICY "Allow public to view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- 5. Policy to allow users to delete their own photos
CREATE POLICY "Allow users to delete their own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
