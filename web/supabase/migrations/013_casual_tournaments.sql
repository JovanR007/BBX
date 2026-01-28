-- Add columns for Casual Tournaments feature

-- 1. is_ranked
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS is_ranked boolean DEFAULT false;

-- 2. organizer_id (To track who created it, if not a store)
-- FORCE DROP to ensure we get the correct type (Text) if it was previously created as UUID
ALTER TABLE tournaments DROP COLUMN IF EXISTS organizer_id;

-- Create as TEXT matching profiles(id)
ALTER TABLE tournaments
ADD COLUMN organizer_id text references profiles(id);

-- 3. Backfill existing data
-- Set all existing tournaments to Ranked=true
UPDATE tournaments SET is_ranked = true;

-- Backfill organizer_id from the store's owner
-- Direct copy since both are text
UPDATE tournaments t
SET organizer_id = s.owner_id
FROM stores s
WHERE t.store_id = s.id;
