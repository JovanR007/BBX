-- Hotfix: Remove the restrictive check constraint on match_target_points
-- The previous schema likely enforced CHECK match_target_points = 4 
-- We need to remove this to allow 5pt (Swiss) and 7pt (Finals)

ALTER TABLE tournaments 
DROP CONSTRAINT IF EXISTS tournaments_match_target_points_check;

-- Optional: Add a new, more flexible constraint if desired
-- ALTER TABLE tournaments 
-- ADD CONSTRAINT tournaments_match_target_points_check 
-- CHECK (match_target_points IN (4, 5, 7));
