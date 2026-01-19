import { supabaseAdmin } from "./supabase-admin.js";

/** Fisher–Yates shuffle */
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Build a Set of all past swiss pairings to avoid rematches.
 */
async function loadPlayedSet(tournamentId) {
    const { data, error } = await supabaseAdmin
        .from("matches")
        .select("participant_a_id, participant_b_id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "swiss")
        .not("participant_b_id", "is", null);

    if (error) throw error;

    const played = new Set();
    for (const m of data || []) {
        if (!m.participant_a_id || !m.participant_b_id) continue;
        played.add(pairKey(m.participant_a_id, m.participant_b_id));
    }
    return played;
}

/**
 * Get active participants ranked by swiss standings.
 * (View must provide: match_wins, buchholz, point_diff.)
 */
async function loadActiveStandings(tournamentId) {
    const { data, error } = await supabaseAdmin
        .from("swiss_standings")
        .select(
            "participant_id, display_name, participant_status, match_wins, buchholz, point_diff"
        )
        .eq("tournament_id", tournamentId);

    if (error) throw error;

    return (data || []).filter((p) =>
        ["approved", "checked_in"].includes(p.participant_status)
    );
}

/**
 * BBX BYE: winner gets 4, bye side gets 3.
 */
function makeByeMatch({ tournamentId, roundId, roundNumber, matchNumber, aId, target }) {
    return {
        tournament_id: tournamentId,
        stage: "swiss",
        swiss_round_id: roundId,
        swiss_round_number: roundNumber,
        match_number: matchNumber,
        participant_a_id: aId,
        participant_b_id: null,

        score_a: target,
        score_b: target - 1,
        target_points: target,

        status: "complete",
        winner_id: aId,
        is_bye: true,
    };
}

export async function generateSwissRound(tournamentId, roundNumber) {
    if (!tournamentId) throw new Error("Missing tournamentId");
    if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 5) {
        throw new Error("roundNumber must be an integer 1–5 (Swiss stage is 5 rounds).");
    }

    // Tournament settings
    const { data: tournament, error: tErr } = await supabaseAdmin
        .from("tournaments")
        .select("id, match_target_points, swiss_rounds")
        .eq("id", tournamentId)
        .single();
    if (tErr) throw tErr;

    if (roundNumber > (tournament.swiss_rounds ?? 5)) {
        throw new Error(`Tournament swiss_rounds is ${tournament.swiss_rounds}. Cannot create round ${roundNumber}.`);
    }

    // Guard: Round N-1 must be completed (except round 1)
    if (roundNumber > 1) {
        const { data: prev, error: prevErr } = await supabaseAdmin
            .from("swiss_rounds")
            .select("status")
            .eq("tournament_id", tournamentId)
            .eq("round_number", roundNumber - 1)
            .maybeSingle();

        if (prevErr) throw prevErr;

        if (!prev) throw new Error(`Round ${roundNumber - 1} does not exist yet.`);
        if (prev.status !== "complete") {
            throw new Error(`Round ${roundNumber - 1} is not complete yet.`);
        }
    }

    // Create (or re-open) the swiss_round row
    const { data: round, error: rErr } = await supabaseAdmin
        .from("swiss_rounds")
        .upsert(
            { tournament_id: tournamentId, round_number: roundNumber, status: "active" },
            { onConflict: "tournament_id,round_number" }
        )
        .select()
        .single();
    if (rErr) throw rErr;

    // Guard: don’t generate twice
    const { data: existing, error: exErr } = await supabaseAdmin
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("stage", "swiss")
        .eq("swiss_round_number", roundNumber)
        .limit(1);
    if (exErr) throw exErr;
    if (existing && existing.length > 0) {
        throw new Error(`Round ${roundNumber} matches already exist. Aborting to prevent duplicates.`);
    }

    // Pull standings and played pairings
    const activePlayers = await loadActiveStandings(tournamentId);
    if (activePlayers.length < 2) throw new Error("Not enough active participants.");

    const played = await loadPlayedSet(tournamentId);

    // Group by wins (Swiss score groups)
    const groups = new Map(); // wins -> players[]
    for (const p of activePlayers) {
        const wins = p.match_wins ?? 0;
        if (!groups.has(wins)) groups.set(wins, []);
        groups.get(wins).push(p);
    }
    const winKeys = [...groups.keys()].sort((a, b) => b - a);

    // Pairing with float-down
    let floatDown = [];
    const matchesToInsert = [];
    let matchNumber = 1;
    const target = tournament.match_target_points ?? 4;

    for (const w of winKeys) {
        let pool = shuffle(groups.get(w));

        if (floatDown.length) {
            pool = [...floatDown, ...pool];
            floatDown = [];
        }

        if (pool.length % 2 === 1) {
            floatDown = [pool.pop()];
        }

        while (pool.length) {
            const a = pool.shift();

            // best-effort: pick someone not played yet
            let pickIndex = -1;
            for (let i = 0; i < pool.length; i++) {
                const b = pool[i];
                if (!played.has(pairKey(a.participant_id, b.participant_id))) {
                    pickIndex = i;
                    break;
                }
            }
            if (pickIndex === -1) pickIndex = 0;

            const b = pool.splice(pickIndex, 1)[0];
            played.add(pairKey(a.participant_id, b.participant_id));

            matchesToInsert.push({
                tournament_id: tournamentId,
                stage: "swiss",
                swiss_round_id: round.id,
                swiss_round_number: roundNumber,
                match_number: matchNumber++,
                participant_a_id: a.participant_id,
                participant_b_id: b.participant_id,
                score_a: 0,
                score_b: 0,
                target_points: target,
                status: "pending",
                winner_id: null,
                is_bye: false,
            });
        }
    }

    // If leftover -> BYE
    if (floatDown.length === 1) {
        matchesToInsert.push(
            makeByeMatch({
                tournamentId,
                roundId: round.id,
                roundNumber,
                matchNumber: matchNumber++,
                aId: floatDown[0].participant_id,
                target,
            })
        );
    }

    // Insert
    const { data: inserted, error: mErr } = await supabaseAdmin
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
