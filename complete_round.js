import "dotenv/config";
import { supabase } from "./lib/supabase.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;
const roundNumber = Number(process.argv[2]);

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

    for (let tries = 0; tries < 25; tries++) {
        const f = pickWeightedFinish();
        if (valid.includes(f)) return f;
    }
    return valid[Math.floor(Math.random() * valid.length)];
}

function simulateToTarget(target = 4) {
    let a = 0;
    let b = 0;
    const events = [];

    while (a < target && b < target) {
        const winSide = Math.random() < 0.5 ? "A" : "B";
        const remaining = winSide === "A" ? (target - a) : (target - b);
        const finish = pickFinishThatFits(remaining);
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
    if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 5) {
        throw new Error("Usage: node complete_round.js <roundNumber 1-5>");
    }

    const { data: matches, error: mErr } = await supabase
        .from("matches")
        .select("id, participant_a_id, participant_b_id, target_points, is_bye, status")
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "swiss")
        .eq("swiss_round_number", roundNumber)
        .in("status", ["pending", "in_progress"])
        .eq("is_bye", false);

    if (mErr) throw mErr;

    if (!matches || matches.length === 0) {
        console.log(`No Round ${roundNumber} matches to complete.`);
    } else {
        for (const match of matches) {
            const target = match.target_points ?? 4;
            const sim = simulateToTarget(target);

            const winnerId =
                sim.winner === "A" ? match.participant_a_id : match.participant_b_id;

            const eventRows = sim.events.map((e) => ({
                match_id: match.id,
                winner_participant_id:
                    e.winner === "A" ? match.participant_a_id : match.participant_b_id,
                finish: e.finish,
                points_awarded: e.points_awarded,
            }));

            const { error: eErr } = await supabase.from("match_events").insert(eventRows);
            if (eErr) throw eErr;

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

            console.log(`Completed match ${match.id}: ${sim.score_a}-${sim.score_b}`);
        }
    }

    // Mark swiss_round as complete if no pending matches remain
    const { data: pending, error: pErr } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "swiss")
        .eq("swiss_round_number", roundNumber)
        .in("status", ["pending", "in_progress"])
        .limit(1);

    if (pErr) throw pErr;

    if (!pending || pending.length === 0) {
        const { error: rErr } = await supabase
            .from("swiss_rounds")
            .update({ status: "complete" })
            .eq("tournament_id", TOURNAMENT_ID)
            .eq("round_number", roundNumber);

        if (rErr) throw rErr;
        console.log(`Round ${roundNumber} marked complete.`);
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
