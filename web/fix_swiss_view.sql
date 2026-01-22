-- Recreate swiss_standings view with 'dropped' column
-- Assumes 'participants' table has a 'status' column. If it is named 'participant_status', change p.status to p.participant_status below.

DROP VIEW IF EXISTS swiss_standings;

CREATE OR REPLACE VIEW swiss_standings AS
WITH match_stats AS (
  SELECT
    winner_id,
    count(*) as wins
  FROM matches
  WHERE stage = 'swiss' AND status = 'complete' AND winner_id IS NOT NULL
  GROUP BY winner_id
),
scores AS (
    SELECT
        participant_id,
        sum(diff) as point_diff
    FROM (
        SELECT participant_a_id as participant_id, (score_a - score_b) as diff FROM matches WHERE stage = 'swiss' AND status = 'complete'
        UNION ALL
        SELECT participant_b_id as participant_id, (score_b - score_a) as diff FROM matches WHERE stage = 'swiss' AND status = 'complete'
    ) s
    GROUP BY participant_id
),
opponents AS (
     SELECT
        p.id as player_id,
        m.participant_a_id as opponent_id
     FROM participants p
     JOIN matches m ON m.participant_b_id = p.id
     WHERE m.stage = 'swiss' AND m.participant_a_id IS NOT NULL
     UNION ALL
     SELECT
        p.id as player_id,
        m.participant_b_id as opponent_id
     FROM participants p
     JOIN matches m ON m.participant_a_id = p.id
     WHERE m.stage = 'swiss' AND m.participant_b_id IS NOT NULL
),
opp_wins AS (
    SELECT
        o.player_id,
        COALESCE(SUM(ms.wins), 0) as buchholz
    FROM opponents o
    LEFT JOIN match_stats ms ON ms.winner_id = o.opponent_id
    GROUP BY o.player_id
)
SELECT
  p.id as participant_id,
  p.tournament_id,
  p.display_name,
  COALESCE(p.status, 'approved') as participant_status, -- Alias to participant_status for compatibility
  p.dropped, -- Newly added column
  COALESCE(ms.wins, 0) as match_wins,
  COALESCE(s.point_diff, 0) as point_diff,
  COALESCE(ow.buchholz, 0) as buchholz
FROM participants p
LEFT JOIN match_stats ms ON ms.winner_id = p.id
LEFT JOIN scores s ON s.participant_id = p.id
LEFT JOIN opp_wins ow ON ow.player_id = p.id;
