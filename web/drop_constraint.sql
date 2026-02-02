-- Drop the constraint that requires a winner when match is complete
ALTER TABLE matches
DROP CONSTRAINT IF EXISTS winner_required_when_complete;
