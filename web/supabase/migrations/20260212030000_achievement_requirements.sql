-- Add requirement tracking columns to badges
ALTER TABLE badges ADD COLUMN IF NOT EXISTS requirement_text TEXT;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS requirement_type TEXT; -- e.g., 'tournaments_joined', 'matches_won', 'burst_finishes'
ALTER TABLE badges ADD COLUMN IF NOT EXISTS target_value INTEGER;

-- Update existing badges with detailed instructions and metadata for progress tracking
UPDATE badges SET 
    requirement_text = 'Join and complete 1 tournament.',
    requirement_type = 'tournaments_joined',
    target_value = 1
WHERE name = 'First Strike';

UPDATE badges SET 
    requirement_text = 'Complete your profile information including name and avatar.',
    requirement_type = 'profile_complete',
    target_value = 1
WHERE name = 'Vanguard';

UPDATE badges SET 
    requirement_text = 'Participate in 10 different tournaments.',
    requirement_type = 'tournaments_joined',
    target_value = 10
WHERE name = 'Regular';

UPDATE badges SET 
    requirement_text = 'Play a total of 50 matches across any tournaments.',
    requirement_type = 'matches_played',
    target_value = 50
WHERE name = 'Battle Tested';

UPDATE badges SET 
    requirement_text = 'Win a match 4-3 after trailing 0-3.',
    requirement_type = 'special_win_condition',
    target_value = 1
WHERE name = 'Comeback Kid';

UPDATE badges SET 
    requirement_text = 'Participate in 50 different tournaments.',
    requirement_type = 'tournaments_joined',
    target_value = 50
WHERE name = 'Veteran';

UPDATE badges SET 
    requirement_text = 'Participate in 20 tournaments hosted by the same store.',
    requirement_type = 'store_loyalty',
    target_value = 20
WHERE name = 'Store Hero';

UPDATE badges SET 
    requirement_text = 'Finish the Swiss stage of a tournament in 1st place.',
    requirement_type = 'swiss_rank_1',
    target_value = 1
WHERE name = 'Top Seed';

UPDATE badges SET 
    requirement_text = 'Win 50 matches specifically via Burst Finish.',
    requirement_type = 'burst_finishes',
    target_value = 50
WHERE name = 'Burst Artist';

UPDATE badges SET 
    requirement_text = 'Win 50 matches specifically via Spin-Finish.',
    requirement_type = 'spin_finishes',
    target_value = 50
WHERE name = 'Spin-Finish King';

UPDATE badges SET 
    requirement_text = 'Have an account age of 1 year or older.',
    requirement_type = 'account_age_days',
    target_value = 365
WHERE name = 'Legacy Blader';

UPDATE badges SET 
    requirement_text = 'Finish a Swiss stage (min. 4 rounds) with a 100% win record.',
    requirement_type = 'swiss_undefeated',
    target_value = 1
WHERE name = 'Undefeated';

UPDATE badges SET 
    requirement_text = 'Achieve a career total of 200 match wins.',
    requirement_type = 'matches_won',
    target_value = 200
WHERE name = 'Master Blader';

UPDATE badges SET 
    requirement_text = 'Win 20 matches specifically via Xtreme Finish.',
    requirement_type = 'xtreme_finishes',
    target_value = 20
WHERE name = 'Xtreme Legend';

UPDATE badges SET 
    requirement_text = 'Host and conclude 10 tournaments as a store owner.',
    requirement_type = 'tournaments_hosted',
    target_value = 10
WHERE name = 'The Architect';

UPDATE badges SET 
    requirement_text = 'Acheive 1st place in the Top Cut of an official tournament.',
    requirement_type = 'tournaments_won',
    target_value = 1
WHERE name = 'Grand Champion';

UPDATE badges SET 
    requirement_text = 'Win 3 tournaments in a row (consecutive entries).',
    requirement_type = 'consecutive_wins',
    target_value = 3
WHERE name = '3-Peat';

UPDATE badges SET 
    requirement_text = 'Go 100% undefeated across both Swiss and Top Cut in a single event.',
    requirement_type = 'perfect_tournament',
    target_value = 1
WHERE name = 'Unkillable Demon King';

UPDATE badges SET 
    requirement_text = 'Participate in 200 different tournaments.',
    requirement_type = 'tournaments_joined',
    target_value = 200
WHERE name = 'The GOAT';

UPDATE badges SET 
    requirement_text = 'Finish a seasonal cycle as Rank 1 on the Global Leaderboard.',
    requirement_type = 'global_rank_1',
    target_value = 1
WHERE name = 'World Class';

UPDATE badges SET 
    requirement_text = 'Win 10 tournaments (1st place) in your career.',
    requirement_type = 'tournaments_won',
    target_value = 10
WHERE name = 'Living Legend';
