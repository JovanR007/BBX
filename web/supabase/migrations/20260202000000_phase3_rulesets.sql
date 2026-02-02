-- Migration: Phase 3 Tournament Standardization

-- 1. Add ruleset_config to tournaments
-- This stores the specific point values and win conditions for the tournament
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS ruleset_config JSONB DEFAULT '{}'::jsonb;

-- 2. Add metadata to matches
-- This stores state for complex match types (e.g. Best of 3 set scores, current set)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Add Beyblade tracking columns to matches
-- Stores the Beyblade(s) used by each participant in the match
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS bey_a TEXT,
ADD COLUMN IF NOT EXISTS bey_b TEXT;

-- 4. Comment on columns for clarity
COMMENT ON COLUMN tournaments.ruleset_config IS 'Stores scoring rules (spin=1, etc) and match structure (target_points, win_condition)';
COMMENT ON COLUMN matches.metadata IS 'Stores extra state for matches, e.g. current set number in Best of 3';
COMMENT ON COLUMN matches.bey_a IS 'Text description of Participant A Beyblade(s)';
COMMENT ON COLUMN matches.bey_b IS 'Text description of Participant B Beyblade(s)';
