-- Create Badges Table
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url TEXT,
    type TEXT NOT NULL DEFAULT 'auto', -- 'auto' or 'manual'
    tier TEXT NOT NULL DEFAULT 'common' -- 'common', 'uncommon', 'rare', 'epic', 'legendary', 'diamond'
);

-- Create User Badges Junction Table
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL, -- Optional: link to the event that triggered it
    earned_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate badges for the same user (unless we want multi-earning, but usually not)
    UNIQUE(user_id, badge_id)
);

-- RLS Policies
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view badges
CREATE POLICY "Public badges are viewable by everyone" ON badges
    FOR SELECT USING (true);

-- Allow everyone to view earned badges
CREATE POLICY "Earned badges are viewable by everyone" ON user_badges
    FOR SELECT USING (true);

-- Admin only for modification (handled by service role in real life, but for local dev we might keep it simple)

-- Seed Initial Badges
INSERT INTO badges (name, description, tier, type) VALUES
('First Strike', 'Join your first tournament', 'common', 'auto'),
('Vanguard', 'Link your account and complete your profile', 'common', 'auto'),
('Regular', 'Participate in 10 total tournaments', 'uncommon', 'auto'),
('Battle Tested', 'Complete 50 total matches', 'uncommon', 'auto'),
('Comeback Kid', 'Win a match after being down 3 points (4-3 win from 0-3)', 'uncommon', 'auto'),
('Veteran', 'Participate in 50 total tournaments', 'rare', 'auto'),
('Store Hero', 'Join 20 tournaments at the same store', 'rare', 'auto'),
('Top Seed', 'Finish a Swiss stage as Rank 1', 'rare', 'auto'),
('Burst Artist', 'Win 50 matches via Burst Finish', 'rare', 'auto'),
('Spin-Finish King', 'Win 50 matches via Spin-Finish', 'rare', 'auto'),
('Legacy Blader', 'Account age 1 year+', 'rare', 'auto'),
('Undefeated', 'Finish a Swiss stage with a 100% win rate (min 4 rounds)', 'epic', 'auto'),
('Master Blader', 'Win 200 total matches', 'epic', 'auto'),
('Xtreme Legend', 'Win 20 matches via Xtreme Finish', 'epic', 'auto'),
('The Architect', 'Host 10 tournaments as a Store Owner', 'epic', 'auto'),
('Grand Champion', 'Win a tournament (First place in Top Cut)', 'legendary', 'auto'),
('3-Peat', 'Win 3 tournaments back-to-back-to-back', 'legendary', 'auto'),
('Unkillable Demon King', '100% win rate in a full tournament (Swiss + Top Cut)', 'legendary', 'auto'),
('The GOAT', 'Participate in 200 total tournaments', 'legendary', 'auto'),
('World Class', 'Achieve Rank 1 on the Global Leaderboard (Season End)', 'diamond', 'auto'),
('Living Legend', 'Win 10 Tournaments total', 'diamond', 'auto')
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    tier = EXCLUDED.tier,
    type = EXCLUDED.type;
