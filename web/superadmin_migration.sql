-- Add role column to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Update the specific user to be superadmin
-- Note: We are using the Stack Auth ID if known, or we can try to math by username if available.
-- Since we don't know the exact ID for 'shearjovan7@gmail.com' without querying Stack,
-- we will rely on the code-level override for now, but this SQL prepares the DB.

-- OPTIONAL: If you know your username, uncomment and run:
-- UPDATE profiles SET role = 'superadmin' WHERE username = 'JovanR007';
