-- Ensure 'covers' bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own covers" ON storage.objects;

-- Create policy to allow public read access
CREATE POLICY "Covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

-- Create policy to allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'covers' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Create policy to allow authenticated users to update their own covers
CREATE POLICY "Users can update their own covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'covers' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Create policy to allow authenticated users to delete their own covers
CREATE POLICY "Users can delete their own covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'covers' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);
