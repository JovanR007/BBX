-- Add ranking and location columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ranking_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Newbie'; -- Storing tier for easier querying, updated via logic

-- Create index for faster leaderboard lookups
CREATE INDEX IF NOT EXISTS profiles_ranking_points_idx ON profiles (ranking_points DESC);
CREATE INDEX IF NOT EXISTS profiles_country_city_idx ON profiles (country, city);

-- Optional: Create a view for "active" leaderboard (only players with > 0 points)
CREATE OR REPLACE VIEW active_leaderboard AS
SELECT 
    id, 
    username, 
    display_name, 
    avatar_url, 
    ranking_points, 
    tier, 
    country, 
    city,
    -- Calculate Win Rate on the fly if needed, or rely on client fetching specific stats
    (SELECT count(*) FROM matches WHERE winner_id = profiles.id::uuid) as total_wins
FROM profiles
WHERE ranking_points > 0
ORDER BY ranking_points DESC;
