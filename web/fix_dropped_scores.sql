-- Fix scores for matches where a player was dropped but the match wasn't auto-scored.
-- Scenarios:
-- 1. Participant A is dropped. Match Pending. -> Winner B (4-3)
-- 2. Participant B is dropped. Match Pending. -> Winner A (4-3)

WITH dropped_players AS (
    SELECT id FROM participants WHERE dropped = true
),
matches_to_fix AS (
    SELECT m.id, m.participant_a_id, m.participant_b_id, m.target_points
    FROM matches m
    JOIN participants pa ON m.participant_a_id = pa.id
    JOIN participants pb ON m.participant_b_id = pb.id
    WHERE m.stage = 'swiss' 
    AND m.status = 'pending'
    AND (pa.dropped = true OR pb.dropped = true)
)
UPDATE matches
SET
    status = 'complete',
    score_a = CASE 
        WHEN matches.participant_a_id IN (SELECT id FROM dropped_players) THEN (COALESCE(matches.target_points, 4) - 1)
        ELSE COALESCE(matches.target_points, 4)
    END,
    score_b = CASE 
        WHEN matches.participant_b_id IN (SELECT id FROM dropped_players) THEN (COALESCE(matches.target_points, 4) - 1)
        ELSE COALESCE(matches.target_points, 4)
    END,
    winner_id = CASE
        WHEN matches.participant_a_id IN (SELECT id FROM dropped_players) THEN matches.participant_b_id
        ELSE matches.participant_a_id
    END
FROM matches_to_fix
WHERE matches.id = matches_to_fix.id;
