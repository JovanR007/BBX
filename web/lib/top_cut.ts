import { supabaseAdmin } from "./supabase-admin";

/**
 * Get active participants ranked by swiss standings.
 */
async function loadActiveStandings(tournamentId: string) {
    const { data, error } = await supabaseAdmin
        .from("swiss_standings")
        .select(
            "participant_id, display_name, participant_status, match_wins, buchholz, point_diff"
        )
        .eq("tournament_id", tournamentId)
        .order("match_wins", { ascending: false })
        .order("point_diff", { ascending: false })
        .order("buchholz", { ascending: false });

    if (error) throw error;

    return (data || []).filter((p) =>
        ["approved", "checked_in"].includes(p.participant_status)
    );
}

interface ByeMatchParams {
    tournamentId: string;
    roundId?: string; // Not used in top_cut typically? Or passed?
    matchNumber: number;
    aId: string;
    target: number;
}

function makeByeMatch({ tournamentId, matchNumber, aId, target }: ByeMatchParams) {
    return {
        tournament_id: tournamentId,
        stage: "top_cut",
        bracket_round: 1, // First round of elimination
        match_number: matchNumber,
        participant_a_id: aId,
        participant_b_id: null,

        score_a: target,
        score_b: target - 1, // BBX standard 4-3 BYE
        target_points: target,

        status: "complete",
        winner_id: aId,
        is_bye: true,
    };
}

export async function generateTopCut(tournamentId: string, requestedCutSize: number) {
    if (!tournamentId) throw new Error("Missing tournamentId");

    // 1. Get current tournament settings if cutSize not provided
    let cutSize = requestedCutSize;
    if (!cutSize) {
        const { data: t, error: tErr } = await supabaseAdmin
            .from("tournaments")
            .select("cut_size, match_target_points")
            .eq("id", tournamentId)
            .single();
        if (tErr) throw tErr;
        cutSize = t.cut_size;
    }

    if (![4, 8, 16, 32, 64].includes(cutSize)) {
        throw new Error(`Invalid cut_size ${cutSize}. Must be 4, 8, 16, 32, or 64.`);
    }

    // 2. Load Standings
    const standings = await loadActiveStandings(tournamentId);
    if (standings.length < 2) throw new Error("Not enough players for a Top Cut.");

    // 3. Take top N players
    const qualified = standings.slice(0, cutSize);
    console.log(`Generating Top ${cutSize} cut with ${qualified.length} qualified players.`);

    // 4. Create seeding array (size = cutSize)
    // Fill with players, rest are null (BYEs)
    const seeds = new Array(cutSize).fill(null);
    for (let i = 0; i < qualified.length; i++) {
        seeds[i] = qualified[i];
    }

    // 5. Generate Pairings (1 vs 32, 2 vs 31, etc.)
    const matchesToInsert = [];
    const target = 4; // Early elim rounds are 4 points

    // We only iterate top half (0 to cut/2 - 1)
    for (let i = 0; i < cutSize / 2; i++) {
        const topSeed = seeds[i];
        const botSeed = seeds[cutSize - 1 - i];

        const matchNum = i + 1; // 1-indexed

        if (!topSeed) {
            // Should not happen if we sort correctly and valid count > 0, 
            // but effectively double BYE? No, just ignore.
            continue;
        }

        if (!botSeed) {
            // BYE for the Top Seed
            matchesToInsert.push(
                makeByeMatch({
                    tournamentId,
                    matchNumber: matchNum,
                    aId: topSeed.participant_id,
                    target
                })
            );
        } else {
            // Real Match
            matchesToInsert.push({
                tournament_id: tournamentId,
                stage: "top_cut",
                bracket_round: 1, // First round of elimination
                match_number: matchNum,
                participant_a_id: topSeed.participant_id,
                participant_b_id: botSeed.participant_id,
                score_a: 0,
                score_b: 0,
                target_points: target,
                status: "pending",
                winner_id: null,
                is_bye: false,
            });
        }
    }

    // 6. Check for duplicates
    const { data: existing, error: eErr } = await supabaseAdmin
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "top_cut")
        .eq("bracket_round", 1)
        .limit(1);

    if (eErr) throw eErr;
    if (existing && existing.length > 0) {
        throw new Error("Top Cut (Round 1) already exists!");
    }

    // 7. Insert
    const { data: inserted, error: iErr } = await supabaseAdmin
        .from("matches")
        .insert(matchesToInsert)
        .select();

    if (iErr) throw iErr;

    return inserted;
}
