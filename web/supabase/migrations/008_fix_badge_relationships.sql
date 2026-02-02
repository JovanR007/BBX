-- 1. Drop existing constraints if they exist (to be safe)
ALTER TABLE IF EXISTS user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;

-- 2. Change user_id type to TEXT to match profiles.id
ALTER TABLE user_badges ALTER COLUMN user_id TYPE TEXT;

-- 3. Add foreign key referencing profiles(id)
-- This allows PostgREST to recognize the relationship for nested selects
ALTER TABLE user_badges 
ADD CONSTRAINT user_badges_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Ensure RLS is still valid
-- (Already enabled, but good to keep in mind)
