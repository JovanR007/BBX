-- Add columns for Casual Tournaments feature

-- 1. is_ranked
ALTER TABLE tournaments
ADD COLUMN is_ranked boolean DEFAULT false;

-- 2. organizer_id (To track who created it, if not a store)
ALTER TABLE tournaments
ADD COLUMN organizer_id uuid references auth.users(id);

-- 3. Backfill existing data
-- Set all existing tournaments to Ranked=true
UPDATE tournaments SET is_ranked = true;

-- Backfill organizer_id from the store's owner, BUT ONLY if the user exists
UPDATE tournaments t
SET organizer_id = s.owner_id::uuid
FROM stores s
JOIN auth.users u ON s.owner_id::uuid = u.id
WHERE t.store_id = s.id;

-- 4. Make organizer_id NOT NULL if we want to enforce every tournament has an owner
-- But for now, let's leave it nullable to be safe with existing data edge cases?
-- Actually, better to enforce it going forward, but let's keep it nullable for safety.
