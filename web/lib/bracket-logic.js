
export async function advanceBracket(supabase, tournamentId) {
    if (!tournamentId) throw new Error("Missing tournamentId");

    // 1. Determine current latest round
    const { data: rounds, error: rErr } = await supabase
        .from("matches")
        .select("bracket_round, status")
        .eq("tournament_id", tournamentId)
        .eq("stage", "top_cut")
        .order("bracket_round", { ascending: false });

    if (rErr) throw rErr;
    if (!rounds || rounds.length === 0) {
        throw new Error("No Top Cut matches found. Cannot advance.");
    }

    const currentRoundNum = rounds[0].bracket_round;

    // Check if the latest round is fully complete
    const { data: incomplete, error: iErr } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "top_cut")
        .eq("bracket_round", currentRoundNum)
        .neq("status", "complete")
        .limit(1);

    if (iErr) throw iErr;
    if (incomplete.length > 0) {
        throw new Error(`Round ${currentRoundNum} is not complete yet.`);
    }

    // 2. Fetch tournament cut_size to determine bracket structure
    const { data: tournament, error: tErr } = await supabase
        .from("tournaments")
        .select("cut_size")
        .eq("id", tournamentId)
        .single();

    if (tErr) throw tErr;

    const cutSize = tournament.cut_size;
    const multiplier = Math.pow(2, currentRoundNum);
    const idealMatchCount = Math.floor(cutSize / multiplier);

    // 3. Fetch matches from current round
    const { data: prevMatches, error: pmErr } = await supabase
        .from("matches")
        .select("id, match_number, winner_id, participant_a_id, participant_b_id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "top_cut")
        .eq("bracket_round", currentRoundNum);

    if (pmErr) throw pmErr;

    // Index them by match_number for O(1) lookup
    const matchesByNum = new Map();
    prevMatches.forEach(m => matchesByNum.set(m.match_number, m));

    if (idealMatchCount < 1) {
        console.log("Bracket seems finished.");
        return [];
    }

    const nextRoundNum = Number(currentRoundNum) + 1;
    console.log(`Advancing from Round ${currentRoundNum} (Ideal matches: ${idealMatchCount}) to Round ${nextRoundNum}...`);

    const isFinals = (idealMatchCount === 2); // If we are pairing 2 matches, next is Finals (1 match) + 3rd Place

    // Special Case: FINALS (Generate 1st place and 3rd place matches)
    if (isFinals) {
        console.log("Generating Finals and 3rd Place Match...");
        const matchA = matchesByNum.get(1); // Match 1 from previous round (top half of bracket)
        const matchB = matchesByNum.get(2); // Match 2 from previous round (bottom half of bracket)

        if (!matchA || !matchB) throw new Error("Critical: Missing semi-final match data.");

        // Identify Winners and Losers
        const getLoser = (m) => (m.winner_id === m.participant_a_id ? m.participant_b_id : m.participant_a_id);

        const winnerA = matchA.winner_id;
        const loserA = getLoser(matchA);
        const winnerB = matchB.winner_id;
        const loserB = getLoser(matchB);

        const target = 7; // Finals target points

        const matchesToInsert = [];

        // 1st Place Match (Finals)
        matchesToInsert.push({
            tournament_id: tournamentId,
            stage: "top_cut",
            bracket_round: nextRoundNum,
            match_number: 1, // Finals is always Match 1
            participant_a_id: winnerA,
            participant_b_id: winnerB,
            score_a: 0, score_b: 0,
            status: "pending", winner_id: null, is_bye: false,
            target_points: target,
        });

        // 3rd Place Match
        matchesToInsert.push({
            tournament_id: tournamentId,
            stage: "top_cut",
            bracket_round: nextRoundNum,
            match_number: 2, // 3rd Place is always Match 2
            participant_a_id: loserA,
            participant_b_id: loserB,
            score_a: 0, score_b: 0,
            status: "pending", winner_id: null, is_bye: false,
            target_points: 4,
        });

        // Check Duplicates
        const { data: existing } = await supabase
            .from("matches")
            .select("id")
            .eq("tournament_id", tournamentId)
            .eq("stage", "top_cut")
            .eq("bracket_round", nextRoundNum)
            .limit(1);

        if (existing && existing.length > 0) throw new Error(`Round ${nextRoundNum} already exists.`);

        // Insert
        const { data: inserted, error: insErr } = await supabase.from("matches").insert(matchesToInsert).select();
        if (insErr) throw insErr;
        return inserted;
    }

    // Standard Round Advancement
    const matchesToInsert = [];
    const target = 4; // Default target

    // Iterate the Top Half of the Ideal Grid (Next Round Size is current / 2)
    const nextRoundSize = idealMatchCount / 2;
    for (let i = 1; i <= nextRoundSize; i++) {
        // Standard Bracket Progression: Adjacent Matches Merge
        const slotA = 2 * i - 1;
        const slotB = 2 * i;
        const currentMatchNum = i;

        const matchA = matchesByNum.get(slotA);
        const matchB = matchesByNum.get(slotB);
        let newMatch = null;

        // Case 1: Both exist -> Create VS Match
        if (matchA && matchB) {
            newMatch = {
                participant_a_id: matchA.winner_id,
                participant_b_id: matchB.winner_id,
                score_a: 0, score_b: 0,
                status: "pending", winner_id: null, is_bye: false
            };
        }
        // Case 2: Only A exists -> A gets BYE
        else if (matchA && !matchB) {
            newMatch = {
                participant_a_id: matchA.winner_id, participant_b_id: null,
                score_a: target, score_b: target - 1,
                status: "complete", winner_id: matchA.winner_id, is_bye: true
            };
        }
        // Case 3: Only B exists -> B gets BYE
        else if (!matchA && matchB) {
            newMatch = {
                participant_a_id: matchB.winner_id, participant_b_id: null,
                score_a: target, score_b: target - 1,
                status: "complete", winner_id: matchB.winner_id, is_bye: true
            };
        }

        if (newMatch) {
            matchesToInsert.push({
                tournament_id: tournamentId,
                stage: "top_cut",
                bracket_round: nextRoundNum,
                match_number: currentMatchNum,
                target_points: target,
                ...newMatch
            });
        }
    }

    // Check Duplicates
    const { data: existing } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "top_cut")
        .eq("bracket_round", nextRoundNum)
        .limit(1);

    if (existing && existing.length > 0) throw new Error(`Round ${nextRoundNum} already exists.`);

    const { data: inserted, error: insErr } = await supabase.from("matches").insert(matchesToInsert).select();
    if (insErr) throw insErr;

    return inserted;
}
