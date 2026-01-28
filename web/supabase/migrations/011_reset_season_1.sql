-- 1. Create a "Pre-Season" record to store the history
-- We use a known ID or just let it generate one. We'll capture it in a variable if possible, but simpler to just insert and select.
DO $$
DECLARE
    pre_season_id uuid;
BEGIN
    -- Insert "Pre-Season" (ended just now)
    INSERT INTO seasons (name, start_date, end_date, is_active)
    VALUES ('Pre-Season', '2020-01-01', now(), false)
    RETURNING id INTO pre_season_id;

    -- 2. Archive current Profile points into player_seasonal_stats
    -- Only archive for users that actually exist in auth.users
    INSERT INTO player_seasonal_stats (user_id, season_id, final_points, final_tier)
    SELECT p.id::uuid, pre_season_id, p.ranking_points, p.tier
    FROM profiles p
    JOIN auth.users u ON p.id::uuid = u.id
    WHERE p.ranking_points > 0;

    -- 3. Reset Profiles for the new season
    UPDATE profiles
    SET ranking_points = 0,
        tier = 'Newbie';

END $$;
