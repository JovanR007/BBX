
import { supabaseAdmin } from "./supabase-admin";

export async function advanceBracket(tournamentId: string) {
    const supabase = supabaseAdmin;
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
        .eq("bracket_round", currentRoundNum.toString())
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
    // Standard Elimination Bracket: structure must follow a power of 2 (4, 8, 16, 32, 64)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(cutSize)));
    const multiplier = Math.pow(2, currentRoundNum);
    const idealMatchCount = Math.floor(bracketSize / multiplier);

    // 3. Fetch matches from current round
    const { data: prevMatches, error: pmErr } = await supabase
        .from("matches")
        .select("id, match_number, winner_id, participant_a_id, participant_b_id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "top_cut")
        .eq("bracket_round", currentRoundNum.toString());

    if (pmErr) throw pmErr;

    // Index them by match_number for O(1) lookup
    const matchesByNum = new Map();
    prevMatches.forEach(m => matchesByNum.set(m.match_number, m));

    if (idealMatchCount < 1) {
        throw new Error(`Bracket finished? Cut:${cutSize}, R:${currentRoundNum}, Ideal:${idealMatchCount}`);
        return [];
    }

    const nextRoundNum = Number(currentRoundNum) + 1;
    // console.log(`Advancing from Round ${currentRoundNum} (Ideal matches: ${idealMatchCount}) to Round ${nextRoundNum}...`);

    const isFinals = (idealMatchCount === 2); // If we are pairing 2 matches, next is Finals (1 match) + 3rd Place

    const nextRoundSize = idealMatchCount / 2;

    // Debug
    if (nextRoundSize < 1 && !isFinals) {
        throw new Error(`Logic Error: Next Size < 1. Cut:${cutSize}, Mul:${multiplier}, Next:${nextRoundSize}`);
    }

    // Special Case: FINALS (Generate 1st place and 3rd place matches)
    if (isFinals) {
        console.log("Generating Finals and 3rd Place Match...");
        const matchA = matchesByNum.get(1); // Match 1 from previous round (top half of bracket)
        const matchB = matchesByNum.get(2); // Match 2 from previous round (bottom half of bracket)

        if (!matchA || !matchB) throw new Error("Critical: Missing semi-final match data.");

        // Identify Winners and Losers
        const getLoser = (m: any) => (m.winner_id === m.participant_a_id ? m.participant_b_id : m.participant_a_id);

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
            bracket_round: nextRoundNum.toString(),
            match_number: 1, // Finals is always Match 1
            participant_a_id: winnerA,
            participant_b_id: winnerB,
            score_a: 0, score_b: 0,
            status: "pending", winner_id: null, is_bye: false,
            target_points: target,
            metadata: { type: 'grand_final' }
        });

        // 3rd Place Match
        matchesToInsert.push({
            tournament_id: tournamentId,
            stage: "top_cut",
            bracket_round: nextRoundNum.toString(),
            match_number: 2, // 3rd Place is always Match 2
            participant_a_id: loserA,
            participant_b_id: loserB,
            score_a: 0, score_b: 0,
            status: "pending", winner_id: null, is_bye: false,
            target_points: 4,
            metadata: { type: '3rd_place' }
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
                bracket_round: nextRoundNum.toString(),
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
        .eq("bracket_round", nextRoundNum.toString())
        .limit(1);

    if (existing && existing.length > 0) throw new Error(`Round ${nextRoundNum} already exists.`);

    const { data: inserted, error: insErr } = await supabase.from("matches").insert(matchesToInsert).select();
    if (insErr) throw insErr;

    if (!inserted || inserted.length === 0) {
        throw new Error(`Generated 0 matches. Proposed: ${matchesToInsert.length}. Cut:${cutSize}, Ideal:${idealMatchCount}, NextR:${nextRoundNum}`);
    }

    return inserted;
}

/**
 * Propagates the winner of a match to the next round in the bracket.
 * Should be called whenever a match is completed or its score/winner changes.
 */
export async function promoteWinnerToNextRound(matchId: string) {
    const supabase = supabaseAdmin;

    // 1. Get current match details
    const { data: match, error: mErr } = await supabase
        .from("matches")
        .select("id, tournament_id, stage, bracket_round, match_number, winner_id, status")
        .eq("id", matchId)
        .single();

    if (mErr || !match) {
        console.error("Promote: Match not found", matchId);
        return;
    }

    // Only applicable for Top Cut matches that are complete
    if (match.stage !== 'top_cut' || !match.bracket_round || !match.match_number) return;
    // We allow propagating even if status!=complete (e.g. if we reverted to pending, we might want to propagate 'null' to next round?
    // For now, let's assume we propagate whatever winner_id is (id or null).

    const nextRound = match.bracket_round + 1;
    const nextMatchNum = Math.ceil(match.match_number / 2);
    const isPlayerA = (match.match_number % 2) === 1;

    // 2. Find the destination match
    const { data: nextMatch, error: nErr } = await supabase
        .from("matches")
        .select("id, participant_a_id, participant_b_id, status")
        .eq("tournament_id", match.tournament_id)
        .eq("stage", 'top_cut')
        .eq("bracket_round", nextRound)
        .eq("match_number", nextMatchNum)
        .single();

    if (nErr && nErr.code !== 'PGRST116') { // Ignore "Not Found" error
        console.error("Promote: Error finding next match", nErr);
        return;
    }

    if (!nextMatch) {
        // Next round hasn't been generated yet. Nothing to do.
        // The advanceBracketAction() will handle it later.
        return;
    }

    // 3. Update the destination match
    const updates: any = {};
    if (isPlayerA) {
        if (nextMatch.participant_a_id !== match.winner_id) updates.participant_a_id = match.winner_id;
    } else {
        if (nextMatch.participant_b_id !== match.winner_id) updates.participant_b_id = match.winner_id;
    }

    if (Object.keys(updates).length > 0) {
        console.log(`Promoting ${match.winner_id} to Match ${nextRound}-${nextMatchNum} (Slot ${isPlayerA ? 'A' : 'B'})`);
        const { error: uErr } = await supabase
            .from("matches")
            .update(updates)
            .eq("id", nextMatch.id);

        if (uErr) console.error("Promote: Update failed", uErr);
    }
}
