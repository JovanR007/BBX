import "dotenv/config";
import { supabase } from "./lib/supabase.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;

// Finish type points (must match DB constraint)
const FINISH_POINTS = {
    spin: 1,
    over: 2,
    burst: 2,
    xtreme: 3
};

async function run() {
    if (!TOURNAMENT_ID) throw new Error("Missing TEST_TOURNAMENT_ID in .env");

    const args = process.argv.slice(2);
    // Usage: node report_match_result.js <match_number/ID> <scoreA> <scoreB> <finish_type>
    // Example: node report_match_result.js 4 2 4 xtreme
    // Note: If finishing match with Xtreme (3pts) when A=2, B=4.
    // If winner is B (4 pts). Previous score was 4-3=1. 2-1.
    // This script calculates the "Final Event" to insert.
    // It assumes the user provides the FINAL score.

    if (args.length < 4) {
        console.log("Usage: node report_match_result.js <match_number> <scoreA> <scoreB> <final_finish_type>");
        console.log("Example: node report_match_result.js 3 4 2 over");
        console.log("Available finishes: spin(1), over(2), burst(2), xtreme(3)");
        process.exit(1);
    }

    const matchRef = args[0];
    const scoreA = Number(args[1]);
    const scoreB = Number(args[2]);
    const finishType = args[3].toLowerCase();

    if (!FINISH_POINTS[finishType]) {
        throw new Error(`Invalid finish type: ${finishType}`);
    }

    const finishPoints = FINISH_POINTS[finishType];

    // 1. Find the match
    let loadQ = supabase
        .from("matches")
        .select("id, participant_a_id, participant_b_id, target_points, status")
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "top_cut");

    // Check if UUID or Match Number
    if (matchRef.length > 10 && matchRef.includes("-")) {
        loadQ = loadQ.eq("id", matchRef);
    } else {
        loadQ = loadQ.eq("match_number", matchRef);
        // Warning: This selects across ALL rounds if match_number isn't unique across rounds?
        // Wait, match_number IS expected to be unique per round, but potentially duplicate across rounds?
        // Actually, advance_bracket resets match_number to 1 each round.
        // So just passing "1" is ambiguous.
        // The user should probably pass ROUND number too, or we assume "latest active round" match?
        // Or unique ID.
        // Let's prompt for Round Number if not ID.
        if (!process.argv[4] && !matchRef.includes("-")) {
            // Try to find "pending" match with this number
            loadQ = loadQ.eq("status", "pending");
            // Risk: What if Round 3 Match 1 and Round 4 Match 1 are both pending?
            // Unlikely with sequential advancement.
        } else if (process.argv[4]) {
            loadQ = loadQ.eq("bracket_round", process.argv[4]);
        }
    }

    const { data: matches, error: mErr } = await loadQ;
    if (mErr) throw mErr;

    if (!matches || matches.length === 0) {
        throw new Error(`Match ${matchRef} not found (or not pending).`);
    }
    // Ambiguity check
    if (matches.length > 1) {
        throw new Error(`Multiple matches found for ${matchRef}. Please specify ID or ensure only one exists.`);
    }

    const match = matches[0];
    const winnerId = scoreA > scoreB ? match.participant_a_id : match.participant_b_id;
    const winnerSide = scoreA > scoreB ? "A" : "B";

    console.log(`Reporting Match ${matchRef}: ${scoreA}-${scoreB} (${winnerSide} via ${finishType})`);

    // 2. Validate Result
    if (scoreA < match.target_points && scoreB < match.target_points) {
        console.warn("WARNING: Neither player reached target points. Is this correct?");
    }
    if (scoreA > match.target_points || scoreB > match.target_points) {
        // BBX: Can you overshoot? Yes? "First to 7". 
        // e.g. 6-6 -> Xtreme -> 9-6. This is valid.
    }

    // 3. Clear existing events for this match? (Resetting score logic)
    // If we are overriding, we should probably clear events to avoid double counting if UI sums them.
    // "match_events" are usually logs.
    // Let's Insert the "Final Strike".
    // Problem: If score is 4-0. And we insert "Xtreme" (3pts). DB consistency?
    // The DB "matches" table stores the score. The "events" table is history.
    // We should allow the matches table update regardless, but inserting a coherent event is good practice.

    const eventRow = {
        match_id: match.id,
        winner_participant_id: winnerId,
        finish: finishType,
        points_awarded: finishPoints
    };

    const { error: eErr } = await supabase.from("match_events").insert(eventRow);
    if (eErr) console.warn("Event insert warning:", eErr.message);

    // 4. Update Match
    const { error: uErr } = await supabase
        .from("matches")
        .update({
            score_a: scoreA,
            score_b: scoreB,
            winner_id: winnerId,
            status: "complete"
        })
        .eq("id", match.id);

    if (uErr) throw uErr;

    console.log("Success.");
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
