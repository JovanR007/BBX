// Since we don't have direct DB access, please run the following in your Supabase SQL Editor:
// Copy content from: j:\JOJO STUFF\BeyBracket\web\supabase\migrations\009_leaderboard_schema.sql

import { supabaseAdmin } from "./lib/supabase-admin";

async function apply() {
    console.log("Please run the SQL migration manually in Supabase Dashboard.");
    console.log(`
-- Add ranking and location columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ranking_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Newbie'; -- Storing tier for easier querying, updated via logic

-- Create index for faster leaderboard lookups
CREATE INDEX IF NOT EXISTS profiles_ranking_points_idx ON profiles (ranking_points DESC);
CREATE INDEX IF NOT EXISTS profiles_country_city_idx ON profiles (country, city);

-- Optional: Create a view for active leaderboard with correct UUID casting
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
    (SELECT count(*) FROM matches WHERE winner_id = profiles.id::uuid) as total_wins
FROM profiles
WHERE ranking_points > 0
ORDER BY ranking_points DESC;
    `);
}

apply();
