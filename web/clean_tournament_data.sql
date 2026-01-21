-- Clean bad data (Tournaments and related activity)
-- Preserves Stores and Profiles (Users)

-- 1. Matches (Dependent on Participants and Rounds)
DELETE FROM matches;

-- 2. Participants (Dependent on Tournaments)
DELETE FROM participants;

-- 3. Swiss Rounds (Dependent on Tournaments)
DELETE FROM swiss_rounds;

-- 4. Tournament Judges (Dependent on Tournaments)
DELETE FROM tournament_judges;

-- 5. Tournaments (Dependent on Stores)
DELETE FROM tournaments;

-- Note: Stores and Profiles are untouched.
