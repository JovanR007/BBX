-- Hotfix 2: Remove constraints on the MATCHES table
-- It appears there is a second check constraint on the 'matches' table itself (target_points)

-- 1. Matches Table Check
ALTER TABLE matches 
DROP CONSTRAINT IF EXISTS matches_target_points_check;

ALTER TABLE matches 
DROP CONSTRAINT IF EXISTS matches_match_target_points_check;

-- 2. Matches Table Default (remove if forced to 4)
ALTER TABLE matches 
ALTER COLUMN target_points DROP DEFAULT;

-- 3. Double Check Tournaments Table (just in case)
ALTER TABLE tournaments 
DROP CONSTRAINT IF EXISTS tournaments_match_target_points_check;
