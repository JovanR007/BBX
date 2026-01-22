-- Row Level Security (RLS) Policies for BeyBracket
-- Run these in your Supabase SQL Editor

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_judges ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STORES POLICIES
-- =====================================================

-- Public can view all stores
CREATE POLICY "Public stores are viewable by everyone"
ON stores FOR SELECT
USING (true);

-- Only owner can update their store
CREATE POLICY "Users can update own stores"
ON stores FOR UPDATE
USING (auth.uid() = owner_id);

-- =====================================================
-- TOURNAMENTS POLICIES
-- =====================================================

-- Public can view all tournaments
CREATE POLICY "Tournaments are viewable by everyone"
ON tournaments FOR SELECT
USING (true);

-- Store owner can manage tournaments
CREATE POLICY "Store owner can insert tournaments"
ON tournaments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM stores WHERE stores.id = tournaments.store_id AND stores.owner_id = auth.uid()
    )
);

CREATE POLICY "Store owner can update tournaments"
ON tournaments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM stores WHERE stores.id = tournaments.store_id AND stores.owner_id = auth.uid()
    )
);

-- Judges can also update tournaments they judge
CREATE POLICY "Judges can update tournament"
ON tournaments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM tournament_judges WHERE tournament_judges.tournament_id = tournaments.id AND tournament_judges.user_id = auth.uid()
    )
);

-- =====================================================
-- PARTICIPANTS POLICIES
-- =====================================================

-- Public can view participants
CREATE POLICY "Participants are viewable by everyone"
ON participants FOR SELECT
USING (true);

-- Anyone can add themselves as participant (for tournaments with open registration)
CREATE POLICY "Users can add themselves as participants"
ON participants FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Only tournament owner/judges can update participants
CREATE POLICY "Owner or judge can update participants"
ON participants FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM tournaments t
        LEFT JOIN stores s ON t.store_id = s.id
        LEFT JOIN tournament_judges tj ON tj.tournament_id = t.id
        WHERE t.id = participants.tournament_id
        AND (s.owner_id = auth.uid() OR tj.user_id = auth.uid())
    )
);

-- =====================================================
-- MATCHES POLICIES
-- =====================================================

-- Public can view matches
CREATE POLICY "Matches are viewable by everyone"
ON matches FOR SELECT
USING (true);

-- Only owner/judges can modify matches
CREATE POLICY "Owner or judge can update matches"
ON matches FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM tournaments t
        LEFT JOIN stores s ON t.store_id = s.id
        LEFT JOIN tournament_judges tj ON tj.tournament_id = t.id
        WHERE t.id = matches.tournament_id
        AND (s.owner_id = auth.uid() OR tj.user_id = auth.uid())
    )
);

CREATE POLICY "Owner or judge can insert matches"
ON matches FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tournaments t
        LEFT JOIN stores s ON t.store_id = s.id
        LEFT JOIN tournament_judges tj ON tj.tournament_id = t.id
        WHERE t.id = matches.tournament_id
        AND (s.owner_id = auth.uid() OR tj.user_id = auth.uid())
    )
);

-- =====================================================
-- MATCH EVENTS POLICIES
-- =====================================================

CREATE POLICY "Match events are viewable by everyone"
ON match_events FOR SELECT
USING (true);

CREATE POLICY "Owner or judge can insert match events"
ON match_events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM matches m
        JOIN tournaments t ON m.tournament_id = t.id
        LEFT JOIN stores s ON t.store_id = s.id
        LEFT JOIN tournament_judges tj ON tj.tournament_id = t.id
        WHERE m.id = match_events.match_id
        AND (s.owner_id = auth.uid() OR tj.user_id = auth.uid())
    )
);

-- =====================================================
-- TOURNAMENT JUDGES POLICIES
-- =====================================================

CREATE POLICY "Judges are viewable by everyone"
ON tournament_judges FOR SELECT
USING (true);

CREATE POLICY "Only owner can manage judges"
ON tournament_judges FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM tournaments t
        JOIN stores s ON t.store_id = s.id
        WHERE t.id = tournament_judges.tournament_id
        AND s.owner_id = auth.uid()
    )
);
