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

function key(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Round 2 Swiss pairing:
 * - Group by wins (from swiss_standings view)
 * - Shuffle within group
 * - Float down 1 player if group is odd
 * - Avoid rematches (best-effort)
 * - If odd overall -> BYE (BBX 4–3)
 */
export async function generateSwissRound2(tournamentId) {
    // 1) Tournament settings
    const { data: tournament, error: tErr } = await supabase
        .from("tournaments")
        .select("id, match_target_points")
        .eq("id", tournamentId)
        .single();

    if (tErr) throw tErr;

    // 2) Create / activate round 2
    const { data: round, error: roundErr } = await supabase
        .from("swiss_rounds")
        .upsert(
            {
                tournament_id: tournamentId,
                round_number: 2,
                status: "active",
            },
            { onConflict: "tournament_id,round_number" }
        )
        .select()
        .single();

    if (roundErr) throw roundErr;

    // 3) Guard: don’t generate twice
    const { data: existing, error: exErr } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "swiss")
        .eq("swiss_round_number", 2)
        .limit(1);

    if (exErr) throw exErr;
    if (existing && existing.length > 0) {
        throw new Error("Round 2 matches already exist. Aborting to prevent duplicates.");
    }

    // 4) Pull standings (wins/buchholz/pd) + participant status
    // We only pair approved/checked_in and not dropped.
    const { data: standings, error: sErr } = await supabase
        .from("swiss_standings")
        .select("participant_id, display_name, participant_status, match_wins, buchholz, point_diff")
        .eq("tournament_id", tournamentId);

    if (sErr) throw sErr;

    const activePlayers = (standings || []).filter((p) =>
        ["approved", "checked_in"].includes(p.participant_status)
    );

    if (activePlayers.length < 2) {
        throw new Error("Not enough active participants to generate Round 2.");
    }

    const playerIds = activePlayers.map((p) => p.participant_id);

    // 5) Build rematch map from ALL swiss matches (any round)
    const { data: pastMatches, error: pmErr } = await supabase
        .from("matches")
        .select("participant_a_id, participant_b_id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "swiss")
        .not("participant_b_id", "is", null);

    if (pmErr) throw pmErr;

    const played = new Set();
    for (const m of pastMatches || []) {
        if (!m.participant_a_id || !m.participant_b_id) continue;
        played.add(key(m.participant_a_id, m.participant_b_id));
    }

    // 6) Group by wins
    // Example after R1: some players at 1 win, some at 0 wins.
    const groups = new Map(); // wins -> array of player objects
    for (const p of activePlayers) {
        const w = p.match_wins ?? 0;
        if (!groups.has(w)) groups.set(w, []);
        groups.get(w).push(p);
    }

    // Sort group keys high -> low wins
    const winKeys = [...groups.keys()].sort((a, b) => b - a);

    // 7) Pairing with float-down
    const matchesToInsert = [];
    let floatDown = []; // carry one player to next group if odd
    let matchNumber = 1;

    for (const w of winKeys) {
        // Shuffle inside each score group (MVP behavior)
        let pool = shuffle(groups.get(w));

        // Add floatDown player from higher group (at the front)
        if (floatDown.length) {
            pool = [...floatDown, ...pool];
            floatDown = [];
        }

        // If odd -> float one down (take last)
        if (pool.length % 2 === 1) {
            floatDown = [pool.pop()];
        }

        // Greedy pair: take first, find someone not played yet if possible
        while (pool.length) {
            const a = pool.shift();
            let pickIndex = -1;

            for (let i = 0; i < pool.length; i++) {
                const b = pool[i];
                if (!played.has(key(a.participant_id, b.participant_id))) {
                    pickIndex = i;
                    break;
                }
            }

            // If everyone is a rematch, just take the next person (fallback)
            if (pickIndex === -1) pickIndex = 0;

            const b = pool.splice(pickIndex, 1)[0];

            // Mark as played for future pairing checks
            played.add(key(a.participant_id, b.participant_id));

            matchesToInsert.push({
                tournament_id: tournamentId,
                stage: "swiss",
                swiss_round_id: round.id,
                swiss_round_number: 2,
                match_number: matchNumber++,
                participant_a_id: a.participant_id,
                participant_b_id: b.participant_id,
                score_a: 0,
                score_b: 0,
                target_points: tournament.match_target_points,
                status: "pending",
                winner_id: null,
                is_bye: false,
            });
        }
    }

    // 8) If someone is left after all groups -> BYE
    if (floatDown.length === 1) {
        const a = floatDown[0];
        matchesToInsert.push({
            tournament_id: tournamentId,
            stage: "swiss",
            swiss_round_id: round.id,
            swiss_round_number: 2,
            match_number: matchNumber++,
            participant_a_id: a.participant_id,
            participant_b_id: null,

            // BBX BYE logic: 4–3 (bye side is 3)
            score_a: tournament.match_target_points,
            score_b: tournament.match_target_points - 1,
            target_points: tournament.match_target_points,

            status: "complete",
            winner_id: a.participant_id,
            is_bye: true,
        });
    } else if (floatDown.length > 1) {
        // Extremely unlikely with our logic, but guard anyway
        throw new Error("Unexpected leftover players after pairing.");
    }

    // 9) Insert matches
    const { data: inserted, error: mErr } = await supabase
        .from("matches")
        .insert(matchesToInsert)
        .select("id, match_number, participant_a_id, participant_b_id, is_bye, status");

    if (mErr) throw mErr;

    return {
        swiss_round: round,
        inserted_matches: inserted,
        participant_count: activePlayers.length,
    };
}
