-- Create the storage bucket for deck images
INSERT INTO storage.buckets (id, name, public)
VALUES ('deck-images', 'deck-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access to deck images
CREATE POLICY "Public Access deck-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'deck-images' );

-- Policy to allow authenticated users to upload images
CREATE POLICY "Authenticated Upload deck-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'deck-images' );

-- Policy to allow users to update their own images (optional, but good for edits)
CREATE POLICY "Owner Update deck-images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'deck-images' AND auth.uid() = owner );

-- Policy to allow users to delete their own images
CREATE POLICY "Owner Delete deck-images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'deck-images' AND auth.uid() = owner );
