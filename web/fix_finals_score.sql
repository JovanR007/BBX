-- Update Grand Finals (Last Round, Match 1) to 7 points
-- Fixed: Cast calculated round number to text to match 'bracket_round' column type
UPDATE matches
SET target_points = 7
WHERE stage = 'top_cut'
  AND match_number = 1
  AND bracket_round = (
    SELECT ceil(log(2, cut_size))::int::text
    FROM tournaments
    WHERE tournaments.id = matches.tournament_id
  );
