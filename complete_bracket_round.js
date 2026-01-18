import "dotenv/config";
import { supabase } from "./lib/supabase.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;

// Reuse weighted logic from complete_round.js
const FINISH_POINTS = { spin: 1, over: 2, burst: 2, xtreme: 3 };
const WEIGHTED = [
    "spin", "spin", "spin",
    "over", "over", "over",
    "burst", "burst",
    "xtreme",
];

function pickWeightedFinish() {
    return WEIGHTED[Math.floor(Math.random() * WEIGHTED.length)];
}

function pickFinishThatFits(remaining) {
    const valid = Object.entries(FINISH_POINTS)
        .filter(([, pts]) => pts <= remaining)
        .map(([finish]) => finish);

    if (valid.length === 0) return null; // Should not happen if remaining >= 1

    for (let tries = 0; tries < 25; tries++) {
        const f = pickWeightedFinish();
        if (valid.includes(f)) return f;
    }
    return valid[Math.floor(Math.random() * valid.length)];
}

function simulateToTarget(target) {
    let a = 0;
    let b = 0;
    const events = [];

    while (a < target && b < target) {
        const winSide = Math.random() < 0.5 ? "A" : "B";
        const remaining = winSide === "A" ? (target - a) : (target - b);

        const finish = pickFinishThatFits(remaining);
        if (!finish) throw new Error(`Stuck: remaining=${remaining} but no valid finish?`);

        const points_awarded = FINISH_POINTS[finish];

        if (winSide === "A") {
            a += points_awarded;
            events.push({ winner: "A", finish, points_awarded });
        } else {
            b += points_awarded;
            events.push({ winner: "B", finish, points_awarded });
        }
    }

    return { score_a: a, score_b: b, winner: a >= target ? "A" : "B", events };
}

async function run() {
    if (!TOURNAMENT_ID) throw new Error("Missing TEST_TOURNAMENT_ID in .env");

    // 1. Find all pending matches in stage 'top_cut'
    const { data: matches, error: mErr } = await supabase
        .from("matches")
        .select("id, match_number, participant_a_id, participant_b_id, target_points, bracket_round")
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "top_cut")
        .eq("status", "pending");

    if (mErr) throw mErr;

    if (!matches || matches.length === 0) {
        console.log("No pending Top Cut matches found.");
        return;
    }

    console.log(`Found ${matches.length} pending matches in Top Cut.`);

    for (const match of matches) {
        // target_points should be set by generate/advance scripts (4 or 7)
        const target = match.target_points || 4;

        console.log(`Simulating Match ${match.match_number} (Round ${match.bracket_round}) to ${target} pts...`);
        const sim = simulateToTarget(target);

        const winnerId =
            sim.winner === "A" ? match.participant_a_id : match.participant_b_id;

        // Insert events
        const eventRows = sim.events.map((e) => ({
            match_id: match.id,
            winner_participant_id:
                e.winner === "A" ? match.participant_a_id : match.participant_b_id,
            finish: e.finish,
            points_awarded: e.points_awarded,
        }));

        const { error: eErr } = await supabase.from("match_events").insert(eventRows);
        if (eErr) throw eErr;

        // Update match
        const { error: uErr } = await supabase
            .from("matches")
            .update({
                score_a: sim.score_a,
                score_b: sim.score_b,
                winner_id: winnerId,
                status: "complete",
            })
            .eq("id", match.id);

        if (uErr) throw uErr;

        console.log(`  -> Winner: ${winnerId} (${sim.score_a}-${sim.score_b})`);
    }

    console.log("Done.");
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
