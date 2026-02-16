import { supabaseAdmin } from "./supabase-admin";
import { calculateStandings } from "./standings";

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

    if (![4, 8, 12, 16, 24, 32, 48, 64].includes(cutSize)) {
        throw new Error(`Invalid cut_size ${cutSize}. Must be 4, 8, 12, 16, 24, 32, 48, or 64.`);
    }

    // 2. Load Participants and Matches to calculate standings MANUALLY
    // This ensures it matches the "Live Standings" view exactly and ignores any potential DB View staleness.
    const { data: participants, error: pErr } = await supabaseAdmin
        .from("participants")
        .select("*")
        .eq("tournament_id", tournamentId)
        .in("participant_status", ["approved", "checked_in", "active"]) // Ensure we get allowed players
        .eq("dropped", false); // Exclude dropped players from Top Cut? Usually yes.

    if (pErr) throw pErr;
    if (!participants || participants.length < 2) throw new Error("Not enough players for a Top Cut.");

    const { data: matches, error: mErr } = await supabaseAdmin
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("stage", "swiss")
        .eq("status", "complete");

    if (mErr) throw mErr;

    // Calculate Rankings (Wins -> Diff)
    // Cast matches to any for now if strict type mismatch occurs with Supabase return
    const stats = calculateStandings(participants, (matches || []) as any[]);

    // Sort Deterministically (Wins DESC, Diff DESC, ID ASC)
    stats.sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.diff !== b.diff) return b.diff - a.diff;
        return a.id.localeCompare(b.id); // Valid deterministic tie-breaker
    });

    // 3. Take top N players
    const qualifiedStats = stats.slice(0, cutSize);

    // Map back to Participant objects for seeding
    // We need to preserve the order of qualifiedStats!
    const qualified = qualifiedStats.map(s => participants.find(p => p.id === s.id)).filter(Boolean) as any[];

    if (qualified.length === 0) throw new Error("No qualified players found (Match error?)");

    console.log(`Generating Top ${cutSize} cut. Top Seed: ${qualified[0]?.display_name} (${qualifiedStats[0].wins} wins)`);


    // 4. Create seeding array (size = Next Power of 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(cutSize)));
    const seeds = new Array(bracketSize).fill(null);

    // Standard Balanced Seeding (recursive placement)
    // 1-seed Top, 2-seed Bottom, etc.
    function getBalancedSeedingOrder(size: number): number[] {
        let order = [1, 2];
        while (order.length < size) {
            let nextOrder = [];
            for (let i = 0; i < order.length; i++) {
                nextOrder[i * 2] = order[i];
                nextOrder[i * 2 + 1] = order.length * 2 + 1 - order[i];
            }
            order = nextOrder;
        }
        return order;
    }

    const seedingOrder = getBalancedSeedingOrder(bracketSize);

    // Fill seeds array based on rank
    // qualified[0] is rank 1, qualified[1] is rank 2
    for (let i = 0; i < qualified.length; i++) {
        const rank = i + 1;
        const seedIndex = seedingOrder.indexOf(rank);
        if (seedIndex !== -1) {
            seeds[seedIndex] = qualified[i];
        }
    }

    // 5. Generate Pairings (Indices: 0 vs 1, 2 vs 3, etc.)
    const matchesToInsert = [];
    const target = 4; // Early elim rounds are 4 points

    for (let i = 0; i < bracketSize / 2; i++) {
        const topSeed = seeds[i * 2];
        const botSeed = seeds[i * 2 + 1];

        const matchNum = i + 1; // 1-indexed

        if (!topSeed && !botSeed) continue; // Skip empty slots

        if (topSeed && !botSeed) {
            // BYE for the Top Seed
            matchesToInsert.push(
                makeByeMatch({
                    tournamentId,
                    matchNumber: matchNum,
                    aId: topSeed.id,
                    target
                })
            );
        } else if (!topSeed && botSeed) {
            // BYE for the Bot Seed (unlikely with rank 1..N seeding)
            matchesToInsert.push(
                makeByeMatch({
                    tournamentId,
                    matchNumber: matchNum,
                    aId: botSeed.id,
                    target
                })
            );
        } else {
            // Real Match
            matchesToInsert.push({
                tournament_id: tournamentId,
                stage: "top_cut",
                bracket_round: 1,
                match_number: matchNum,
                participant_a_id: topSeed.id,
                participant_b_id: botSeed.id,
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
