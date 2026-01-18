import { supabase } from "./supabase.js";

/** Fisher–Yates shuffle */
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Generate Swiss Round 1 pairings and insert matches.
 * - Shuffles participants
 * - Creates matches race-to-4
 * - If odd: creates a BYE match (complete, winner = A)
 */
export async function generateSwissRound1(tournamentId) {
    // 1) Ensure Swiss round 1 exists (upsert)
    const { data: round, error: roundErr } = await supabase
        .from("swiss_rounds")
        .upsert(
            {
                tournament_id: tournamentId,
                round_number: 1,
                status: "active",
            },
            { onConflict: "tournament_id,round_number" }
        )
        .select()
        .single();

    if (roundErr) throw roundErr;

    // 2) Load tournament settings (target points)
    const { data: tournament, error: tErr } = await supabase
        .from("tournaments")
        .select("id, match_target_points")
        .eq("id", tournamentId)
        .single();

    if (tErr) throw tErr;

    // 3) Load participants (use checked_in if you want strict check-in)
    const { data: participants, error: pErr } = await supabase
        .from("participants")
        .select("id, display_name, status")
        .eq("tournament_id", tournamentId)
        .in("status", ["approved", "checked_in"]);

    if (pErr) throw pErr;

    if (!participants || participants.length < 2) {
        throw new Error("Not enough participants to generate Round 1.");
    }

    // 4) Shuffle and pair
    const shuffled = shuffle(participants);
    const matchesToInsert = [];

    let matchNumber = 1;
    for (let i = 0; i < shuffled.length; i += 2) {
        const a = shuffled[i];
        const b = shuffled[i + 1];

        // BYE case (odd participants)
        if (!b) {
            matchesToInsert.push({
                tournament_id: tournamentId,
                stage: "swiss",
                swiss_round_id: round.id,
                swiss_round_number: 1,
                match_number: matchNumber++,

                participant_a_id: a.id,
                participant_b_id: null,

                // BBX BYE logic: 4–3
                score_a: tournament.match_target_points,
                score_b: tournament.match_target_points - 1,
                target_points: tournament.match_target_points,

                status: "complete",
                winner_id: a.id,
                is_bye: true,
            });
            continue;
        }


        matchesToInsert.push({
            tournament_id: tournamentId,
            stage: "swiss",
            swiss_round_id: round.id,
            swiss_round_number: 1,
            match_number: matchNumber++,

            participant_a_id: a.id,
            participant_b_id: b.id,

            score_a: 0,
            score_b: 0,
            target_points: tournament.match_target_points,
            status: "pending",
            winner_id: null,
            is_bye: false,
        });
    }

    // 5) Insert matches
    const { data: inserted, error: mErr } = await supabase
        .from("matches")
        .insert(matchesToInsert)
        .select("id, match_number, participant_a_id, participant_b_id, is_bye, status");

    if (mErr) throw mErr;

    return {
        swiss_round: round,
        inserted_matches: inserted,
        participant_count: participants.length,
    };
}
